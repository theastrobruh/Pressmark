import { Link2, Link2Off, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RESIZE_PRESETS } from '../constants/presets';
import {
  FormatConfig,
  MediaItem,
  OutputFormat,
  ResizeConfig,
  ResizeFitMode,
  WatermarkLayer,
} from '../types/studio';
import {
  computeTargetDimensions,
  estimateOutputSize,
  formatBytes,
} from '../utils/canvasRenderer';
import { StudioSegmented, StudioSlider } from './StudioControls';

interface ResizeFormatPanelProps {
  activeItem: MediaItem | null;
  layers: WatermarkLayer[];
  resize: ResizeConfig;
  format: FormatConfig;
  onChangeResize: (patch: Partial<ResizeConfig>) => void;
  onChangeFormat: (patch: Partial<FormatConfig>) => void;
}

export function ResizeFormatPanel({
  activeItem,
  layers,
  resize,
  format,
  onChangeResize,
  onChangeFormat,
}: ResizeFormatPanelProps) {
  const [estimate, setEstimate] = useState<{
    estimatedBytes: number;
    targetWidth: number;
    targetHeight: number;
  } | null>(null);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    if (!activeItem || activeItem.kind === 'video') {
      setEstimate(null);
      return;
    }
    let cancelled = false;
    setEstimating(true);
    const timer = setTimeout(() => {
      estimateOutputSize(activeItem, layers, resize, format).then((res) => {
        if (!cancelled) {
          setEstimate(res);
          setEstimating(false);
        }
      });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeItem, layers, resize, format]);

  const srcW = activeItem?.width || 1080;
  const srcH = activeItem?.height || 1080;
  const targetDims = computeTargetDimensions(srcW, srcH, resize);

  const savingsPct =
    activeItem && estimate
      ? Math.round(
          ((activeItem.sizeBytes - estimate.estimatedBytes) / Math.max(1, activeItem.sizeBytes)) *
            100
        )
      : null;

  const sizeRatio =
    activeItem && estimate
      ? Math.max(8, Math.min(100, Math.round((estimate.estimatedBytes / Math.max(1, activeItem.sizeBytes)) * 100)))
      : 100;

  const selectPreset = (presetId: string) => {
    const p = RESIZE_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    if (p.id === 'original') {
      onChangeResize({ enabled: false, presetId: 'original' });
    } else {
      onChangeResize({
        enabled: true,
        presetId: p.id,
        width: p.width,
        height: p.height,
        fitMode: p.fitMode,
      });
    }
  };

  return (
    <aside className="w-full flex-1 min-h-0 lg:w-[388px] lg:flex-none shrink-0 lg:border-l border-white/[0.08] bg-[#11141B] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/[0.08] bg-[#0E1117]">
        <h2 className="text-sm font-display font-semibold text-white">
          Resize &amp; Format Converter
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Standardize dimensions for social feeds and optimize as WebP, JPEG, or PNG.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Platform Presets */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Platform &amp; Web Presets</span>
            <span className="text-[11px] font-mono text-slate-300">
              {targetDims.width}×{targetDims.height}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {RESIZE_PRESETS.map((p) => {
              const isActive =
                (!resize.enabled && p.id === 'original') ||
                (resize.enabled && resize.presetId === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPreset(p.id)}
                  className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer min-h-[46px] ${
                    isActive
                      ? 'bg-blue-600/15 border-blue-500/60 text-white'
                      : 'bg-[#090B0E] border-white/[0.08] hover:border-white/[0.16] text-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-semibold truncate">{p.platform}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">{p.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Dimensions */}
        <div className="space-y-3 pt-4 border-t border-white/[0.07]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Custom Dimensions</span>
            <button
              type="button"
              onClick={() => onChangeResize({ lockAspect: !resize.lockAspect })}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              {resize.lockAspect ? (
                <Link2 className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Link2Off className="w-3.5 h-3.5" />
              )}
              <span>{resize.lockAspect ? 'Ratio Locked' : 'Free Ratio'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Width (px)</label>
              <input
                type="number"
                min={32}
                max={8000}
                value={resize.enabled ? resize.width : srcW}
                onChange={(e) => {
                  const nextW = Math.max(16, parseInt(e.target.value, 10) || 1080);
                  const ratio = srcH / Math.max(1, srcW);
                  onChangeResize({
                    enabled: true,
                    presetId: 'custom',
                    width: nextW,
                    height: resize.lockAspect
                      ? Math.max(16, Math.round(nextW * ratio))
                      : resize.height,
                  });
                }}
                className="w-full px-3 py-2 text-xs font-mono bg-[#090B0E] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Height (px)</label>
              <input
                type="number"
                min={32}
                max={8000}
                value={resize.enabled ? resize.height : srcH}
                disabled={resize.enabled && resize.fitMode === 'max-width'}
                onChange={(e) => {
                  const nextH = Math.max(16, parseInt(e.target.value, 10) || 1080);
                  const ratio = srcW / Math.max(1, srcH);
                  onChangeResize({
                    enabled: true,
                    presetId: 'custom',
                    height: nextH,
                    width: resize.lockAspect
                      ? Math.max(16, Math.round(nextH * ratio))
                      : resize.width,
                  });
                }}
                className="w-full px-3 py-2 text-xs font-mono bg-[#090B0E] border border-white/[0.1] rounded-xl text-white disabled:opacity-40 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Fit Mode */}
          <div>
            <label className="text-[11px] text-slate-400 block mb-1.5">Scaling Fit Mode</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'cover', label: 'Cover (Fill Crop)' },
                  { id: 'contain', label: 'Contain (Letterbox)' },
                  { id: 'max-width', label: 'Max Width Only' },
                  { id: 'stretch', label: 'Stretch Exact' },
                ] as { id: ResizeFitMode; label: string }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChangeResize({ enabled: true, fitMode: mode.id })}
                  className={`py-2 px-2.5 text-[11px] font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                    resize.fitMode === mode.id
                      ? 'bg-white/[0.12] border-white/30 text-white'
                      : 'bg-[#090B0E] border-white/[0.08] text-slate-400 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {resize.enabled && resize.fitMode === 'contain' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Letterbox Background</span>
              <input
                type="color"
                value={resize.backgroundColor}
                onChange={(e) => onChangeResize({ backgroundColor: e.target.value })}
                className="w-7 h-7 rounded-lg bg-transparent border border-white/20 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Format Converter */}
        <div className="space-y-3.5 pt-4 border-t border-white/[0.07]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Output Format</span>
            <span className="text-[11px] text-blue-400 font-medium">Web Performance</span>
          </div>

          <StudioSegmented<OutputFormat>
            value={format.outputFormat}
            options={[
              { id: 'original', label: 'Auto' },
              { id: 'image/webp', label: 'WebP' },
              { id: 'image/jpeg', label: 'JPEG' },
              { id: 'image/png', label: 'PNG' },
            ]}
            onChange={(fmt) => onChangeFormat({ outputFormat: fmt })}
          />

          {(format.outputFormat === 'image/webp' || format.outputFormat === 'image/jpeg') && (
            <div className="space-y-2.5">
              <StudioSlider
                label="Compression Quality"
                min={0.15}
                max={1}
                step={0.01}
                defaultValue={0.88}
                value={format.quality}
                displayValue={`${Math.round(format.quality * 100)}%`}
                hintLeft="Smallest size"
                hintRight="Max detail"
                onChange={(val) => onChangeFormat({ quality: val })}
              />

              {format.outputFormat === 'image/jpeg' && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Transparent PNG Matte</span>
                  <input
                    type="color"
                    value={format.jpegBackground}
                    onChange={(e) => onChangeFormat({ jpegBackground: e.target.value })}
                    className="w-7 h-7 rounded-lg bg-transparent border border-white/20 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}

          {/* Visual Compression Savings Card */}
          {activeItem && activeItem.kind !== 'video' && (
            <div className="p-3.5 rounded-xl bg-[#090B0E] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Estimated Output</span>
                </span>
                <span className="font-mono text-white font-semibold">
                  {estimating || !estimate ? 'Calculating...' : formatBytes(estimate.estimatedBytes)}
                </span>
              </div>

              {estimate && (
                <>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      style={{ width: `${sizeRatio}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        savingsPct !== null && savingsPct > 0
                          ? 'bg-emerald-500'
                          : 'bg-blue-500'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500">
                      Source: {formatBytes(activeItem.sizeBytes)}
                    </span>
                    {savingsPct !== null && (
                      <span
                        className={
                          savingsPct > 0
                            ? 'text-emerald-400'
                            : savingsPct < 0
                              ? 'text-amber-400'
                              : 'text-slate-400'
                        }
                      >
                        {savingsPct > 0
                          ? `${savingsPct}% smaller`
                          : savingsPct < 0
                            ? `+${Math.abs(savingsPct)}% larger`
                            : 'Same size'}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
