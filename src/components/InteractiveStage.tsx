import {
  Download,
  Eye,
  Loader2,
  Pause,
  Play,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FormatConfig,
  MediaItem,
  ResizeConfig,
  WatermarkLayer,
} from '../types/studio';
import {
  computeTargetDimensions,
  getLayerSizeMetrics,
  loadImageAsync,
  renderLayersToContext,
  resolveOutputMimeAndExt,
} from '../utils/canvasRenderer';

interface InteractiveStageProps {
  item: MediaItem | null;
  layers: WatermarkLayer[];
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, patch: Partial<WatermarkLayer>) => void;
  onCommitLastPlaced: () => void;
  resize: ResizeConfig;
  format: FormatConfig;
  onUploadFiles: (files: FileList | File[]) => void;
  onDownloadCurrent: () => void;
  isExportingSingle: boolean;
}

type DragAction =
  | { kind: 'move-layer'; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'scale-layer'; centerPxX: number; centerPxY: number; startDist: number; origScale: number }
  | { kind: 'rotate-layer'; centerPxX: number; centerPxY: number }
  | {
      kind: 'area-handle';
      handle: 'nw' | 'ne' | 'sw' | 'se' | 'move';
      startX: number;
      startY: number;
      origArea: { x: number; y: number; width: number; height: number };
    }
  | { kind: 'split-wipe' };

export function InteractiveStage({
  item,
  layers,
  activeLayerId,
  onSelectLayer,
  onUpdateLayer,
  onCommitLastPlaced,
  resize,
  format,
  onUploadFiles,
  onDownloadCurrent,
  isExportingSingle,
}: InteractiveStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [viewportSize, setViewportSize] = useState({ width: 800, height: 560 });
  const [compareMode, setCompareMode] = useState<'preview' | 'split'>('preview');
  const [holdOriginal, setHoldOriginal] = useState(false);
  const [splitPct, setSplitPct] = useState(0.5);
  const [snapGuide, setSnapGuide] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });
  const [dragAction, setDragAction] = useState<DragAction | null>(null);
  const [isFileDragging, setIsFileDragging] = useState(false);

  // Video state
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Font & logo loading trigger to repaint canvas once ready
  const [assetTick, setAssetTick] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportSize({
          width: Math.max(200, entry.contentRect.width),
          height: Math.max(200, entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    document.fonts?.ready.then(() => {
      if (active) setAssetTick((t) => t + 1);
    });
    layers.forEach((l) => {
      if (l.type === 'image' && l.imageUrl) {
        loadImageAsync(l.imageUrl)
          .then(() => {
            if (active) setAssetTick((t) => t + 1);
          })
          .catch(() => null);
      }
    });
    return () => {
      active = false;
    };
  }, [layers]);

  const targetDims = useMemo(() => {
    if (!item) return { width: 1080, height: 1080 };
    return computeTargetDimensions(item.width, item.height, resize);
  }, [item, resize]);

  // Fit target aspect cleanly inside viewport with generous breathing room
  const stageBox = useMemo(() => {
    const padX = 48;
    const padY = 48;
    const availW = Math.max(180, viewportSize.width - padX);
    const availH = Math.max(180, viewportSize.height - padY);
    const aspect = targetDims.width / Math.max(1, targetDims.height);

    let w = availW;
    let h = w / aspect;
    if (h > availH) {
      h = availH;
      w = h * aspect;
    }
    return {
      width: Math.round(w),
      height: Math.round(h),
    };
  }, [viewportSize, targetDims]);

  // Draw watermark layers onto crisp overlay canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !item) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(stageBox.width * dpr));
    canvas.height = Math.max(1, Math.round(stageBox.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, stageBox.width, stageBox.height);

    if (!holdOriginal) {
      renderLayersToContext(ctx, stageBox.width, stageBox.height, layers, item.name);
    }
    ctx.restore();
  }, [item, layers, stageBox, holdOriginal, assetTick]);

  const activeLayer = useMemo(
    () => layers.find((l) => l.id === activeLayerId) || layers[0] || null,
    [layers, activeLayerId]
  );

  // Active single layer selection bounding box in stage CSS pixels
  const activeBox = useMemo(() => {
    if (!activeLayer || !activeLayer.visible || activeLayer.placementMode !== 'single') {
      return null;
    }
    const metrics = getLayerSizeMetrics(
      activeLayer,
      stageBox.width,
      stageBox.height,
      item?.name
    );
    return {
      cx: activeLayer.x * stageBox.width,
      cy: activeLayer.y * stageBox.height,
      w: Math.max(36, metrics.width + 12),
      h: Math.max(24, metrics.height + 10),
    };
  }, [activeLayer, stageBox, item?.name]);

  // Pointer drag handlers
  const handleWindowMove = useCallback(
    (e: PointerEvent) => {
      if (!dragAction || !activeLayer) return;

      if (dragAction.kind === 'split-wipe') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pct = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
        setSplitPct(pct);
        return;
      }

      if (dragAction.kind === 'move-layer') {
        const dx = (e.clientX - dragAction.startX) / stageBox.width;
        const dy = (e.clientY - dragAction.startY) / stageBox.height;
        let nx = Math.max(0.02, Math.min(0.98, dragAction.origX + dx));
        let ny = Math.max(0.02, Math.min(0.98, dragAction.origY + dy));

        const snapX = Math.abs(nx - 0.5) < 0.015;
        const snapY = Math.abs(ny - 0.5) < 0.015;
        if (snapX) nx = 0.5;
        if (snapY) ny = 0.5;
        setSnapGuide({ x: snapX, y: snapY });

        onUpdateLayer(activeLayer.id, {
          x: Number(nx.toFixed(4)),
          y: Number(ny.toFixed(4)),
        });
      } else if (dragAction.kind === 'scale-layer') {
        const dist = Math.hypot(e.clientX - dragAction.centerPxX, e.clientY - dragAction.centerPxY);
        const ratio = dist / Math.max(12, dragAction.startDist);
        const nextScale = Math.max(0.05, Math.min(0.85, dragAction.origScale * ratio));
        onUpdateLayer(activeLayer.id, { scale: Number(nextScale.toFixed(3)) });
      } else if (dragAction.kind === 'rotate-layer') {
        const angleRad = Math.atan2(
          e.clientY - dragAction.centerPxY,
          e.clientX - dragAction.centerPxX
        );
        let deg = Math.round((angleRad * 180) / Math.PI + 90);
        while (deg > 180) deg -= 360;
        while (deg < -180) deg += 360;
        if (Math.abs(deg) < 4) deg = 0;
        onUpdateLayer(activeLayer.id, { rotation: deg });
      } else if (dragAction.kind === 'area-handle') {
        const dx = (e.clientX - dragAction.startX) / stageBox.width;
        const dy = (e.clientY - dragAction.startY) / stageBox.height;
        const o = dragAction.origArea;
        let nx = o.x;
        let ny = o.y;
        let nw = o.width;
        let nh = o.height;
        const minSize = 0.1;

        if (dragAction.handle === 'move') {
          nx = Math.max(0, Math.min(1 - nw, o.x + dx));
          ny = Math.max(0, Math.min(1 - nh, o.y + dy));
        } else {
          if (dragAction.handle.includes('w')) {
            const nextX = Math.max(0, Math.min(o.x + o.width - minSize, o.x + dx));
            nw = o.width + (o.x - nextX);
            nx = nextX;
          }
          if (dragAction.handle.includes('e')) {
            nw = Math.max(minSize, Math.min(1 - o.x, o.width + dx));
          }
          if (dragAction.handle.includes('n')) {
            const nextY = Math.max(0, Math.min(o.y + o.height - minSize, o.y + dy));
            nh = o.height + (o.y - nextY);
            ny = nextY;
          }
          if (dragAction.handle.includes('s')) {
            nh = Math.max(minSize, Math.min(1 - o.y, o.height + dy));
          }
        }

        onUpdateLayer(activeLayer.id, {
          customArea: {
            ...activeLayer.customArea,
            x: Number(nx.toFixed(4)),
            y: Number(ny.toFixed(4)),
            width: Number(nw.toFixed(4)),
            height: Number(nh.toFixed(4)),
          },
        });
      }
    },
    [dragAction, activeLayer, stageBox, onUpdateLayer]
  );

  const handleWindowUp = useCallback(() => {
    if (dragAction) {
      setDragAction(null);
      setSnapGuide({ x: false, y: false });
      onCommitLastPlaced();
    }
  }, [dragAction, onCommitLastPlaced]);

  useEffect(() => {
    if (!dragAction) return;
    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
    };
  }, [dragAction, handleWindowMove, handleWindowUp]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const { ext } = item ? resolveOutputMimeAndExt(item, format) : { ext: 'png' };

  const mediaFitClass = !resize.enabled || resize.presetId === 'original'
    ? 'object-contain'
    : resize.fitMode === 'cover'
      ? 'object-cover'
      : resize.fitMode === 'stretch'
        ? 'object-fill'
        : 'object-contain';

  return (
    <section
      className="flex-1 min-w-0 bg-[#0A0C0F] relative flex flex-col overflow-hidden select-none"
      onDragOver={(e) => {
        e.preventDefault();
        setIsFileDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFileDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsFileDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onUploadFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Drag & Drop File Overlay */}
      {isFileDragging && (
        <div className="absolute inset-4 z-40 rounded-xl border-2 border-dashed border-blue-500 bg-blue-950/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3 pointer-events-none">
          <Upload className="w-8 h-8 text-blue-400" />
          <p className="text-base font-display font-semibold text-white">
            Drop photos, GIFs, or videos to add to queue
          </p>
        </div>
      )}

      {/* Center Canvas Stage */}
      <div
        ref={viewportRef}
        className="flex-1 min-h-0 flex items-center justify-center p-6 relative"
      >
        {!item ? (
          <div className="text-center max-w-sm space-y-3">
            <p className="text-sm font-medium text-slate-300">No media selected</p>
            <p className="text-xs text-slate-500">
              Drag and drop photos, animated GIFs, or videos anywhere here, or add them from the queue on the left.
            </p>
          </div>
        ) : (
          <div
            style={{
              width: stageBox.width,
              height: stageBox.height,
              backgroundColor:
                format.outputFormat === 'image/jpeg' && (!resize.enabled || resize.fitMode !== 'contain')
                  ? format.jpegBackground
                  : resize.enabled && resize.fitMode === 'contain'
                    ? resize.backgroundColor
                    : undefined,
            }}
            className="relative checkerboard-bg shadow-2xl ring-1 ring-white/[0.12] overflow-hidden"
          >
            {/* Base Media */}
            {item.kind === 'video' ? (
              <video
                ref={videoRef}
                src={item.url}
                autoPlay
                loop
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  setVideoDuration(e.currentTarget.duration || 0);
                }}
                onTimeUpdate={(e) => {
                  setVideoTime(e.currentTarget.currentTime);
                }}
                className={`w-full h-full pointer-events-none ${mediaFitClass}`}
              />
            ) : (
              <img
                src={item.url}
                alt={item.name}
                referrerPolicy="no-referrer"
                draggable={false}
                className={`w-full h-full pointer-events-none ${mediaFitClass}`}
              />
            )}

            {/* Live Watermark Overlay Canvas (clipped when Split Wipe is active) */}
            <canvas
              ref={canvasRef}
              style={{
                width: stageBox.width,
                height: stageBox.height,
                clipPath:
                  compareMode === 'split' && !holdOriginal
                    ? `inset(0 0 0 ${Math.round(splitPct * 100)}%)`
                    : undefined,
              }}
              className="absolute inset-0 pointer-events-none"
            />

            {/* Split Wipe Divider */}
            {compareMode === 'split' && !holdOriginal && (
              <div
                style={{ left: `${splitPct * 100}%` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDragAction({ kind: 'split-wipe' });
                }}
                className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow cursor-ew-resize z-30"
              >
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#13161B] border border-white/70 flex items-center justify-center text-white shadow-lg">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <span className="absolute top-2.5 right-2 text-[10px] font-mono bg-black/70 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                  Original
                </span>
                <span className="absolute top-2.5 left-2 text-[10px] font-mono bg-blue-600/90 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                  Watermarked
                </span>
              </div>
            )}

            {/* Snap Center Guides */}
            {snapGuide.x && (
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-blue-400/80 pointer-events-none z-10" />
            )}
            {snapGuide.y && (
              <div className="absolute left-0 right-0 top-1/2 h-px bg-blue-400/80 pointer-events-none z-10" />
            )}

            {/* Custom Area Interactive Box */}
            {activeLayer && activeLayer.visible && activeLayer.customArea.enabled && (
              <div
                style={{
                  left: `${activeLayer.customArea.x * 100}%`,
                  top: `${activeLayer.customArea.y * 100}%`,
                  width: `${activeLayer.customArea.width * 100}%`,
                  height: `${activeLayer.customArea.height * 100}%`,
                }}
                className="absolute border border-dashed border-blue-400 bg-blue-500/[0.05] z-20"
              >
                {/* Drag bar to move custom area */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelectLayer(activeLayer.id);
                    setDragAction({
                      kind: 'area-handle',
                      handle: 'move',
                      startX: e.clientX,
                      startY: e.clientY,
                      origArea: { ...activeLayer.customArea },
                    });
                  }}
                  className="absolute -top-5 left-0 px-1.5 py-0.5 text-[10px] font-mono bg-blue-600 text-white rounded-t cursor-move whitespace-nowrap"
                >
                  Custom Area
                </button>

                {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
                  const posClass =
                    corner === 'nw'
                      ? '-top-1.5 -left-1.5 cursor-nwse-resize'
                      : corner === 'ne'
                        ? '-top-1.5 -right-1.5 cursor-nesw-resize'
                        : corner === 'sw'
                          ? '-bottom-1.5 -left-1.5 cursor-nesw-resize'
                          : '-bottom-1.5 -right-1.5 cursor-nwse-resize';

                  return (
                    <div
                      key={corner}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setDragAction({
                          kind: 'area-handle',
                          handle: corner,
                          startX: e.clientX,
                          startY: e.clientY,
                          origArea: { ...activeLayer.customArea },
                        });
                      }}
                      className={`absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-xs ${posClass}`}
                    />
                  );
                })}
              </div>
            )}

            {/* Direct Single-Watermark Interactive Drag / Scale / Rotate Frame */}
            {activeBox && activeLayer && !holdOriginal && (
              <div
                style={{
                  left: activeBox.cx,
                  top: activeBox.cy,
                  width: activeBox.w,
                  height: activeBox.h,
                  transform: `translate(-50%, -50%) rotate(${activeLayer.rotation}deg)`,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelectLayer(activeLayer.id);
                  setDragAction({
                    kind: 'move-layer',
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: activeLayer.x,
                    origY: activeLayer.y,
                  });
                }}
                className="absolute border border-blue-400/75 hover:border-blue-400 cursor-move z-25 group"
              >
                {/* Rotation Handle */}
                <div
                  title="Drag to rotate"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setDragAction({
                      kind: 'rotate-layer',
                      centerPxX: rect.left + activeBox.cx,
                      centerPxY: rect.top + activeBox.cy,
                    });
                  }}
                  className="absolute -top-6 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-500 cursor-grab active:cursor-grabbing opacity-80 group-hover:opacity-100"
                />
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-px h-2.5 bg-blue-400/80 pointer-events-none" />

                {/* Corner Scale Handle */}
                <div
                  title="Drag to resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const cPxX = rect.left + activeBox.cx;
                    const cPxY = rect.top + activeBox.cy;
                    setDragAction({
                      kind: 'scale-layer',
                      centerPxX: cPxX,
                      centerPxY: cPxY,
                      startDist: Math.hypot(e.clientX - cPxX, e.clientY - cPxY),
                      origScale: activeLayer.scale,
                    });
                  }}
                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-xs bg-white border-2 border-blue-500 cursor-nwse-resize"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Stage Controls */}
      {item && (
        <div className="h-12 shrink-0 border-t border-white/[0.07] bg-[#111318] px-4 flex items-center justify-between gap-4 overflow-x-auto">
          {/* Output Dimensions & Format */}
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono whitespace-nowrap shrink-0">
            <span className="text-slate-200">
              {targetDims.width}×{targetDims.height}
            </span>
            <span aria-hidden="true">·</span>
            <span className="uppercase">{ext}</span>
            {activeLayer?.placementMode === 'single' && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  X {Math.round(activeLayer.x * 100)}% Y {Math.round(activeLayer.y * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Video Scrubber when Video Active */}
          {item.kind === 'video' && (
            <div className="flex items-center gap-2.5 min-w-[180px] max-w-xs flex-1">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white cursor-pointer"
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(0.1, videoDuration)}
                step={0.05}
                value={videoTime}
                onChange={(e) => {
                  const t = parseFloat(e.target.value);
                  setVideoTime(t);
                  if (videoRef.current) videoRef.current.currentTime = t;
                }}
                className="flex-1 accent-blue-500 h-1 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                {videoTime.toFixed(1)}s
              </span>
            </div>
          )}

          {/* Compare & Quick Download */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 p-0.5 bg-[#0A0C0F] rounded-md border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setCompareMode('preview')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  compareMode === 'preview'
                    ? 'bg-white/[0.12] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setCompareMode('split')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                  compareMode === 'split'
                    ? 'bg-white/[0.12] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Split Wipe
              </button>
            </div>

            <button
              type="button"
              onPointerDown={() => setHoldOriginal(true)}
              onPointerUp={() => setHoldOriginal(false)}
              onPointerLeave={() => setHoldOriginal(false)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                holdOriginal
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-slate-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Hold Original</span>
            </button>

            <button
              type="button"
              disabled={isExportingSingle}
              onClick={onDownloadCurrent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md bg-white/[0.08] hover:bg-white/[0.14] text-white transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {isExportingSingle ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download File</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
