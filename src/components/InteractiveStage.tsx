import {
  Bookmark,
  Download,
  Eye,
  Loader2,
  Pause,
  Play,
  Redo2,
  SlidersHorizontal,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BgRemovalConfig,
  FormatConfig,
  MediaItem,
  ResizeConfig,
  WatermarkLayer,
  WatermarkPreset,
  WorkspaceTab,
} from '../types/studio';
import { processBackgroundRemoval, sampleColorAtPoint } from '../utils/bgRemover';
import {
  computeTargetDimensions,
  getLayerSizeMetrics,
  loadImageAsync,
  renderLayersToContext,
  resolveOutputMimeAndExt,
} from '../utils/canvasRenderer';
import { BgStageTool } from './RemoveBgPanel';

interface InteractiveStageProps {
  activeTab: WorkspaceTab;
  item: MediaItem | null;
  layers: WatermarkLayer[];
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, patch: Partial<WatermarkLayer>) => void;
  onCommitLastPlaced: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  resize: ResizeConfig;
  format: FormatConfig;
  presets: WatermarkPreset[];
  activePresetId: string | null;
  onApplyPreset: (preset: WatermarkPreset) => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onDownloadCurrent: () => void;
  isExportingSingle: boolean;
  // Background Removal Stage Integration
  bgConfig: BgRemovalConfig;
  bgStageTool: BgStageTool;
  bgBrushRadius: number;
  onSampleBgColor: (hex: string) => void;
  onAddBgStroke: (stroke: { type: 'erase' | 'restore'; x: number; y: number; radius: number }) => void;
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
  | { kind: 'split-wipe' }
  | { kind: 'bg-brush' };

const MINI_ANCHORS = [
  { id: 'tl', x: 0.14, y: 0.1 },
  { id: 'tc', x: 0.5, y: 0.1 },
  { id: 'tr', x: 0.86, y: 0.1 },
  { id: 'ml', x: 0.14, y: 0.5 },
  { id: 'c', x: 0.5, y: 0.5 },
  { id: 'mr', x: 0.86, y: 0.5 },
  { id: 'bl', x: 0.14, y: 0.91 },
  { id: 'bc', x: 0.5, y: 0.91 },
  { id: 'br', x: 0.86, y: 0.91 },
];

export function InteractiveStage({
  activeTab,
  item,
  layers,
  activeLayerId,
  onSelectLayer,
  onUpdateLayer,
  onCommitLastPlaced,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  resize,
  format,
  presets,
  activePresetId,
  onApplyPreset,
  onUploadFiles,
  onDownloadCurrent,
  isExportingSingle,
  bgConfig,
  bgStageTool,
  bgBrushRadius,
  onSampleBgColor,
  onAddBgStroke,
}: InteractiveStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageFrameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgPreviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedSourceImgRef = useRef<HTMLImageElement | null>(null);

  const [viewportSize, setViewportSize] = useState({ width: 800, height: 560 });
  const [zoomMultiplier, setZoomMultiplier] = useState(1);
  const [compareMode, setCompareMode] = useState<'preview' | 'split'>('preview');
  const [holdOriginal, setHoldOriginal] = useState(false);
  const [splitPct, setSplitPct] = useState(0.5);
  const [snapGuide, setSnapGuide] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });
  const [dragAction, setDragAction] = useState<DragAction | null>(null);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [brushCursor, setBrushCursor] = useState<{ x: number; y: number } | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [assetTick, setAssetTick] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportSize({
          width: Math.max(180, entry.contentRect.width),
          height: Math.max(180, entry.contentRect.height),
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

  useEffect(() => {
    let cancelled = false;
    loadedSourceImgRef.current = null;
    if (!item || item.kind === 'video') return;
    loadImageAsync(item.url)
      .then((img) => {
        if (!cancelled) {
          loadedSourceImgRef.current = img;
          setAssetTick((t) => t + 1);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [item?.url, item?.kind]);

  const targetDims = useMemo(() => {
    if (!item) return { width: 1080, height: 1080 };
    return computeTargetDimensions(item.width, item.height, resize);
  }, [item, resize]);

  const stageBox = useMemo(() => {
    const padX = viewportSize.width < 500 ? 20 : 44;
    const padY = viewportSize.height < 360 ? 16 : 40;
    const availW = Math.max(150, viewportSize.width - padX);
    const availH = Math.max(150, viewportSize.height - padY);
    const aspect = targetDims.width / Math.max(1, targetDims.height);

    let w = availW;
    let h = w / aspect;
    if (h > availH) {
      h = availH;
      w = h * aspect;
    }
    return {
      width: Math.round(w * zoomMultiplier),
      height: Math.round(h * zoomMultiplier),
    };
  }, [viewportSize, targetDims, zoomMultiplier]);

  const showBgCutout = Boolean(
    item && item.kind !== 'video' && bgConfig.enabled && !holdOriginal
  );

  useEffect(() => {
    const canvas = bgPreviewCanvasRef.current;
    const img = loadedSourceImgRef.current;
    if (!canvas || !img || !item || !showBgCutout) return;

    const srcW = img.naturalWidth || item.width;
    const srcH = img.naturalHeight || item.height;
    const processed = processBackgroundRemoval(img, srcW, srcH, bgConfig, {
      maxDim: 860,
      rubyMaskOverlay: activeTab === 'remove-bg' && bgConfig.previewBackdrop === 'ruby',
    });

    canvas.width = stageBox.width;
    canvas.height = stageBox.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, stageBox.width, stageBox.height);

    if (
      !resize.enabled ||
      resize.presetId === 'original' ||
      resize.fitMode === 'stretch' ||
      resize.fitMode === 'max-width'
    ) {
      ctx.drawImage(processed, 0, 0, stageBox.width, stageBox.height);
    } else if (resize.fitMode === 'contain') {
      const scale = Math.min(stageBox.width / processed.width, stageBox.height / processed.height);
      const drawW = processed.width * scale;
      const drawH = processed.height * scale;
      ctx.drawImage(
        processed,
        (stageBox.width - drawW) / 2,
        (stageBox.height - drawH) / 2,
        drawW,
        drawH
      );
    } else {
      const scale = Math.max(stageBox.width / processed.width, stageBox.height / processed.height);
      const cropW = stageBox.width / scale;
      const cropH = stageBox.height / scale;
      ctx.drawImage(
        processed,
        (processed.width - cropW) / 2,
        (processed.height - cropH) / 2,
        cropW,
        cropH,
        0,
        0,
        stageBox.width,
        stageBox.height
      );
    }
  }, [item, bgConfig, showBgCutout, stageBox, resize, activeTab, assetTick]);

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

  const isBgInteractiveTool =
    activeTab === 'remove-bg' &&
    item?.kind !== 'video' &&
    (bgStageTool === 'eyedropper' || bgStageTool === 'erase' || bgStageTool === 'restore');

  const activeBox = useMemo(() => {
    if (
      isBgInteractiveTool ||
      !activeLayer ||
      !activeLayer.visible ||
      activeLayer.placementMode !== 'single'
    ) {
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
      w: Math.max(40, metrics.width + 14),
      h: Math.max(28, metrics.height + 12),
    };
  }, [activeLayer, stageBox, item?.name, isBgInteractiveTool]);

  // Arrow-key precision nudge for desktop power users
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!activeLayer || activeLayer.placementMode !== 'single' || activeTab !== 'watermark') {
        return;
      }
      const step = e.shiftKey ? 0.04 : 0.008;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onUpdateLayer(activeLayer.id, { x: Math.max(0.02, activeLayer.x - step) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onUpdateLayer(activeLayer.id, { x: Math.min(0.98, activeLayer.x + step) });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUpdateLayer(activeLayer.id, { y: Math.max(0.02, activeLayer.y - step) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onUpdateLayer(activeLayer.id, { y: Math.min(0.98, activeLayer.y + step) });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeLayer, activeTab, onUpdateLayer]);

  const getNormalizedStagePoint = useCallback((clientX: number, clientY: number) => {
    const rect = stageFrameRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
      pxX: clientX - rect.left,
      pxY: clientY - rect.top,
    };
  }, []);

  const handleWindowMove = useCallback(
    (e: PointerEvent) => {
      if (!dragAction) return;

      if (dragAction.kind === 'bg-brush') {
        const pt = getNormalizedStagePoint(e.clientX, e.clientY);
        if (pt && (bgStageTool === 'erase' || bgStageTool === 'restore')) {
          setBrushCursor({ x: pt.pxX, y: pt.pxY });
          onAddBgStroke({
            type: bgStageTool,
            x: pt.x,
            y: pt.y,
            radius: bgBrushRadius,
          });
        }
        return;
      }

      if (dragAction.kind === 'split-wipe') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const pct = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
        setSplitPct(pct);
        return;
      }

      if (!activeLayer) return;

      if (dragAction.kind === 'move-layer') {
        const dx = (e.clientX - dragAction.startX) / stageBox.width;
        const dy = (e.clientY - dragAction.startY) / stageBox.height;
        let nx = Math.max(0.02, Math.min(0.98, dragAction.origX + dx));
        let ny = Math.max(0.02, Math.min(0.98, dragAction.origY + dy));

        const snapX = Math.abs(nx - 0.5) < 0.018;
        const snapY = Math.abs(ny - 0.5) < 0.018;
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
    [
      dragAction,
      activeLayer,
      stageBox,
      onUpdateLayer,
      getNormalizedStagePoint,
      bgStageTool,
      bgBrushRadius,
      onAddBgStroke,
    ]
  );

  const handleWindowUp = useCallback(() => {
    if (dragAction) {
      const wasLayer = dragAction.kind !== 'split-wipe' && dragAction.kind !== 'bg-brush';
      setDragAction(null);
      setSnapGuide({ x: false, y: false });
      if (wasLayer) onCommitLastPlaced();
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

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isBgInteractiveTool || !item) return;
    const pt = getNormalizedStagePoint(e.clientX, e.clientY);
    if (!pt) return;

    if (bgStageTool === 'eyedropper' && loadedSourceImgRef.current) {
      const hex = sampleColorAtPoint(
        loadedSourceImgRef.current,
        item.width,
        item.height,
        pt.x,
        pt.y
      );
      onSampleBgColor(hex);
    } else if (bgStageTool === 'erase' || bgStageTool === 'restore') {
      onAddBgStroke({
        type: bgStageTool,
        x: pt.x,
        y: pt.y,
        radius: bgBrushRadius,
      });
      setDragAction({ kind: 'bg-brush' });
    }
  };

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

  const mediaFitClass =
    !resize.enabled || resize.presetId === 'original'
      ? 'object-contain'
      : resize.fitMode === 'cover'
        ? 'object-cover'
        : resize.fitMode === 'stretch'
          ? 'object-fill'
          : 'object-contain';

  const backdropStyle = useMemo(() => {
    if (activeTab === 'remove-bg' || bgConfig.enabled) {
      if (bgConfig.previewBackdrop === 'dark') return { backgroundColor: '#090a0d' };
      if (bgConfig.previewBackdrop === 'light') return { backgroundColor: '#f8fafc' };
      if (bgConfig.previewBackdrop === 'green') return { backgroundColor: '#16a34a' };
    }
    if (
      format.outputFormat === 'image/jpeg' &&
      (!resize.enabled || resize.fitMode !== 'contain')
    ) {
      return { backgroundColor: format.jpegBackground };
    }
    if (resize.enabled && resize.fitMode === 'contain') {
      return { backgroundColor: resize.backgroundColor };
    }
    return {};
  }, [activeTab, bgConfig.enabled, bgConfig.previewBackdrop, format, resize]);

  const brushPxRadius = Math.round(bgBrushRadius * Math.min(stageBox.width, stageBox.height));

  return (
    <section
      className="flex-1 min-w-0 min-h-0 bg-[radial-gradient(circle_at_50%_42%,_#151A23_0%,_#090B0E_100%)] relative flex flex-col overflow-hidden select-none"
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
        <div className="absolute inset-4 z-40 rounded-2xl border-2 border-dashed border-blue-500 bg-blue-950/60 backdrop-blur-md flex flex-col items-center justify-center gap-3 pointer-events-none">
          <Upload className="w-8 h-8 text-blue-400" />
          <p className="text-base font-display font-semibold text-white">
            Drop photos, GIFs, or videos to add to queue
          </p>
        </div>
      )}

      {/* DESKTOP CONTEXTUAL QUICK TOOLBAR */}
      {item && activeTab === 'watermark' && activeLayer && (
        <div className="hidden lg:flex h-12 shrink-0 border-b border-white/[0.07] bg-[#101319]/90 backdrop-blur-sm px-4 items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-3.5 min-w-0">
            {activeLayer.type === 'text' && (
              <input
                type="text"
                value={activeLayer.text}
                onChange={(e) => onUpdateLayer(activeLayer.id, { text: e.target.value })}
                onBlur={onCommitLastPlaced}
                aria-label="Quick edit watermark text"
                className="w-48 px-3 py-1.5 text-xs bg-[#090B0E] border border-white/[0.12] rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            )}

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-400">Opacity</span>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={activeLayer.opacity}
                onChange={(e) =>
                  onUpdateLayer(activeLayer.id, { opacity: parseFloat(e.target.value) })
                }
                onPointerUp={onCommitLastPlaced}
                className="w-20 accent-blue-500 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-300 w-8">
                {Math.round(activeLayer.opacity * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-400">Size</span>
              <input
                type="range"
                min={0.05}
                max={0.85}
                step={0.01}
                value={activeLayer.scale}
                onChange={(e) =>
                  onUpdateLayer(activeLayer.id, { scale: parseFloat(e.target.value) })
                }
                onPointerUp={onCommitLastPlaced}
                className="w-20 accent-blue-500 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-300 w-8">
                {Math.round(activeLayer.scale * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeLayer.placementMode === 'single' && (
              <div
                className="grid grid-cols-3 gap-0.5 p-1 bg-[#090B0E] rounded-md border border-white/[0.08]"
                title="Quick snap position"
              >
                {MINI_ANCHORS.map((pt) => {
                  const isNear =
                    Math.abs(activeLayer.x - pt.x) < 0.08 &&
                    Math.abs(activeLayer.y - pt.y) < 0.08;
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => {
                        onUpdateLayer(activeLayer.id, { x: pt.x, y: pt.y });
                        onCommitLastPlaced();
                      }}
                      aria-label={`Snap ${pt.id}`}
                      className={`w-2.5 h-2.5 rounded-[2px] cursor-pointer transition-colors ${
                        isNear ? 'bg-blue-500' : 'bg-white/[0.14] hover:bg-white/[0.35]'
                      }`}
                    />
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-blue-400" />
              <select
                value={activePresetId || ''}
                onChange={(e) => {
                  const found = presets.find((p) => p.id === e.target.value);
                  if (found) onApplyPreset(found);
                }}
                aria-label="Quick select preset"
                className="px-2.5 py-1.5 text-xs bg-[#090B0E] border border-white/[0.12] rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 max-w-[175px]"
              >
                <option value="" disabled>
                  Custom Look
                </option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Center Canvas Stage (Scrollable when zoomed > 1x) */}
      <div
        ref={viewportRef}
        className={`flex-1 min-h-0 flex items-center justify-center p-3 sm:p-6 relative ${
          zoomMultiplier > 1 ? 'overflow-auto' : 'overflow-hidden'
        }`}
      >
        {!item ? (
          <div className="text-center max-w-sm space-y-3 px-4">
            <p className="text-sm font-medium text-slate-300">No media selected</p>
            <p className="text-xs text-slate-500">
              Drop photos, animated GIFs, or videos here, or tap Add in the media strip.
            </p>
          </div>
        ) : (
          <div
            ref={stageFrameRef}
            onPointerDown={handleStagePointerDown}
            onPointerMove={(e) => {
              if (bgStageTool === 'erase' || bgStageTool === 'restore') {
                const pt = getNormalizedStagePoint(e.clientX, e.clientY);
                if (pt) setBrushCursor({ x: pt.pxX, y: pt.pxY });
              }
            }}
            onPointerLeave={() => setBrushCursor(null)}
            style={{
              width: stageBox.width,
              height: stageBox.height,
              ...backdropStyle,
              cursor:
                activeTab === 'remove-bg' && bgStageTool === 'eyedropper'
                  ? 'crosshair'
                  : activeTab === 'remove-bg' &&
                      (bgStageTool === 'erase' || bgStageTool === 'restore')
                    ? 'none'
                    : undefined,
            }}
            className={`relative checkerboard-bg shadow-[0_24px_70px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.14] overflow-hidden shrink-0 ${
              isBgInteractiveTool ? 'touch-none' : ''
            }`}
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
            ) : showBgCutout ? (
              <canvas
                ref={bgPreviewCanvasRef}
                className="w-full h-full pointer-events-none block"
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

            {/* Live Watermark Overlay Canvas */}
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

            {/* Brush Cursor */}
            {activeTab === 'remove-bg' &&
              (bgStageTool === 'erase' || bgStageTool === 'restore') &&
              brushCursor && (
                <div
                  style={{
                    left: brushCursor.x,
                    top: brushCursor.y,
                    width: brushPxRadius * 2,
                    height: brushPxRadius * 2,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 pointer-events-none z-40 ${
                    bgStageTool === 'erase'
                      ? 'border-rose-400 bg-rose-500/15'
                      : 'border-emerald-400 bg-emerald-500/15'
                  }`}
                />
              )}

            {/* Split Wipe Divider */}
            {compareMode === 'split' && !holdOriginal && (
              <div
                style={{ left: `${splitPct * 100}%` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDragAction({ kind: 'split-wipe' });
                }}
                className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow cursor-ew-resize touch-none z-30"
              >
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#13161B] border border-white/70 flex items-center justify-center text-white shadow-lg">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <span className="absolute top-2.5 right-2 text-[10px] font-mono bg-black/75 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                  Original
                </span>
                <span className="absolute top-2.5 left-2 text-[10px] font-mono bg-blue-600/90 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                  Edited
                </span>
              </div>
            )}

            {/* Snap Center Guides */}
            {snapGuide.x && (
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-blue-400/90 pointer-events-none z-10" />
            )}
            {snapGuide.y && (
              <div className="absolute left-0 right-0 top-1/2 h-px bg-blue-400/90 pointer-events-none z-10" />
            )}

            {/* Custom Area Interactive Box */}
            {!isBgInteractiveTool &&
              activeLayer &&
              activeLayer.visible &&
              activeLayer.customArea.enabled && (
                <div
                  style={{
                    left: `${activeLayer.customArea.x * 100}%`,
                    top: `${activeLayer.customArea.y * 100}%`,
                    width: `${activeLayer.customArea.width * 100}%`,
                    height: `${activeLayer.customArea.height * 100}%`,
                  }}
                  className="absolute border border-dashed border-blue-400 bg-blue-500/[0.05] z-20"
                >
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
                    className="absolute -top-6 left-0 px-2 py-0.5 text-[10px] font-mono bg-blue-600 text-white rounded-t cursor-move touch-none whitespace-nowrap"
                  >
                    Custom Area
                  </button>

                  {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
                    const posClass =
                      corner === 'nw'
                        ? '-top-2 -left-2 cursor-nwse-resize'
                        : corner === 'ne'
                          ? '-top-2 -right-2 cursor-nesw-resize'
                          : corner === 'sw'
                            ? '-bottom-2 -left-2 cursor-nesw-resize'
                            : '-bottom-2 -right-2 cursor-nwse-resize';

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
                        className={`absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-xs touch-none ${posClass}`}
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
                className="absolute border border-blue-400/75 hover:border-blue-400 cursor-move touch-none z-25 group"
              >
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
                  className="absolute -top-7 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-blue-500 cursor-grab active:cursor-grabbing touch-none opacity-90 sm:opacity-80 group-hover:opacity-100"
                />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-blue-400/80 pointer-events-none" />

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
                  className="absolute -bottom-2 -right-2 w-4 h-4 rounded-xs bg-white border-2 border-blue-500 cursor-nwse-resize touch-none"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Stage Studio Dock */}
      {item && (
        <div className="h-12 shrink-0 border-t border-white/[0.07] bg-[#101319]/95 px-3 sm:px-4 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 font-mono whitespace-nowrap shrink-0">
            <span className="text-slate-200">
              {targetDims.width}×{targetDims.height}
            </span>
            <span aria-hidden="true">·</span>
            <span className="uppercase">{ext}</span>
            {bgConfig.enabled && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-blue-400">Cutout</span>
              </>
            )}
          </div>

          {item.kind === 'video' && (
            <div className="flex items-center gap-2 min-w-[130px] max-w-xs flex-1">
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
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Undo / Redo */}
            <div className="hidden sm:flex items-center gap-0.5 p-0.5 bg-[#090B0E] rounded-lg border border-white/[0.08]">
              <button
                type="button"
                disabled={!canUndo}
                onClick={onUndo}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
                className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={!canRedo}
                onClick={onRedo}
                title="Redo (Ctrl+Shift+Z)"
                aria-label="Redo"
                className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden md:flex items-center gap-0.5 p-0.5 bg-[#090B0E] rounded-lg border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setZoomMultiplier((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                aria-label="Zoom out"
                className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/[0.08] cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomMultiplier(1)}
                className="px-1.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white cursor-pointer"
                title="Reset zoom to fit"
              >
                {zoomMultiplier === 1 ? 'Fit' : `${Math.round(zoomMultiplier * 100)}%`}
              </button>
              <button
                type="button"
                onClick={() => setZoomMultiplier((z) => Math.min(2.25, Number((z + 0.25).toFixed(2))))}
                aria-label="Zoom in"
                className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/[0.08] cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Compare */}
            <div className="flex items-center gap-0.5 p-0.5 bg-[#090B0E] rounded-lg border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setCompareMode('preview')}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
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
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  compareMode === 'split'
                    ? 'bg-white/[0.12] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Split
              </button>
            </div>

            <button
              type="button"
              onPointerDown={() => setHoldOriginal(true)}
              onPointerUp={() => setHoldOriginal(false)}
              onPointerLeave={() => setHoldOriginal(false)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                holdOriginal
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-slate-300'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Original</span>
            </button>

            <button
              type="button"
              disabled={isExportingSingle}
              onClick={onDownloadCurrent}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-white/[0.09] hover:bg-white/[0.16] text-white transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {isExportingSingle ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
