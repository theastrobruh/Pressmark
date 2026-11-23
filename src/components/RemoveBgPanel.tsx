import {
  Brush,
  Eraser,
  FlipHorizontal2,
  MousePointer,
  Pipette,
  RotateCcw,
  Sparkles,
  Undo2,
  Wand2,
} from 'lucide-react';
import { DEFAULT_BG_REMOVAL } from '../constants/presets';
import {
  BgPreviewBackdrop,
  BgRemovalConfig,
  BgRemovalMode,
  MediaItem,
} from '../types/studio';
import { StudioSlider, StudioSwitch } from './StudioControls';

export type BgStageTool = 'pan' | 'eyedropper' | 'erase' | 'restore';

interface RemoveBgPanelProps {
  activeItem: MediaItem | null;
  bgConfig: BgRemovalConfig;
  stageTool: BgStageTool;
  brushRadius: number;
  onChangeStageTool: (tool: BgStageTool) => void;
  onChangeBrushRadius: (r: number) => void;
  onChangeBgConfig: (patch: Partial<BgRemovalConfig>) => void;
  onAutoSampleBorder: () => void;
  onApplyToAllImages: () => void;
  onResetBg: () => void;
}

export function RemoveBgPanel({
  activeItem,
  bgConfig,
  stageTool,
  brushRadius,
  onChangeStageTool,
  onChangeBrushRadius,
  onChangeBgConfig,
  onAutoSampleBorder,
  onApplyToAllImages,
  onResetBg,
}: RemoveBgPanelProps) {
  const isUnsupported = activeItem?.kind === 'video';

  return (
    <aside className="w-full flex-1 min-h-0 lg:w-[388px] lg:flex-none shrink-0 bg-[#11141B] lg:border-l border-white/[0.08] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#0E1117]">
        <div>
          <h2 className="text-sm font-display font-semibold text-white">
            Background Remover
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Precision sliders, edge choke, despill &amp; touch-up brush.
          </p>
        </div>
        <div className="shrink-0">
          <StudioSwitch
            label=""
            checked={bgConfig.enabled}
            disabled={isUnsupported}
            onChange={(checked) => onChangeBgConfig({ enabled: checked })}
          />
        </div>
      </div>

      {isUnsupported ? (
        <div className="p-6 text-xs text-slate-400 leading-relaxed">
          Background removal is available for photos and images. Select an image from the queue to remove its background.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Quick Start CTA when off */}
          {!bgConfig.enabled && (
            <button
              type="button"
              onClick={() => {
                onChangeBgConfig({ enabled: true });
                onAutoSampleBorder();
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-950/50 cursor-pointer min-h-[46px]"
            >
              <Wand2 className="w-4 h-4" />
              <span>Auto-Detect &amp; Remove Background</span>
            </button>
          )}

          {/* Removal Algorithm */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Removal Engine Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'flood', label: 'Smart Edge Flood', hint: 'Best for photos' },
                  { id: 'global', label: 'Global Color Key', hint: 'Best for logos' },
                  { id: 'luma-light', label: 'White / Light Key', hint: 'White sweep' },
                  { id: 'luma-dark', label: 'Dark / Black Key', hint: 'Dark studio' },
                ] as { id: BgRemovalMode; label: string; hint: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeBgConfig({ enabled: true, mode: m.id })}
                  className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer min-h-[46px] ${
                    bgConfig.mode === m.id
                      ? 'bg-blue-600/15 border-blue-500/60 text-white'
                      : 'bg-[#090B0E] border-white/[0.08] hover:border-white/[0.16] text-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-semibold truncate">{m.label}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{m.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Color + Eyedropper + Auto-Sample */}
          {(bgConfig.mode === 'flood' || bgConfig.mode === 'global') && (
            <div className="space-y-2 pt-3 border-t border-white/[0.07]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Target Background Color
                </span>
                <span className="text-[11px] font-mono text-slate-400 uppercase">
                  {bgConfig.targetColor}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgConfig.targetColor}
                  onChange={(e) =>
                    onChangeBgConfig({ enabled: true, targetColor: e.target.value })
                  }
                  className="w-10 h-10 rounded-xl bg-transparent border border-white/20 cursor-pointer shrink-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    onChangeBgConfig({ enabled: true });
                    onChangeStageTool(stageTool === 'eyedropper' ? 'pan' : 'eyedropper');
                  }}
                  className={`flex-1 min-h-[42px] px-3 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    stageTool === 'eyedropper'
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-[#090B0E] border-white/[0.1] hover:border-white/25 text-slate-200'
                  }`}
                >
                  <Pipette className="w-3.5 h-3.5" />
                  <span>{stageTool === 'eyedropper' ? 'Tap Image...' : 'Eyedropper'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangeBgConfig({ enabled: true });
                    onAutoSampleBorder();
                  }}
                  className="min-h-[42px] px-3 rounded-xl bg-[#090B0E] border border-white/[0.1] hover:border-white/25 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Auto</span>
                </button>
              </div>
            </div>
          )}

          {/* Detailed Precision Sliders */}
          <div className="space-y-3.5 pt-3 border-t border-white/[0.07]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Precision Control Sliders
              </span>
              <button
                type="button"
                onClick={onResetBg}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <StudioSlider
              label="Color Tolerance"
              min={1}
              max={140}
              step={1}
              defaultValue={36}
              value={bgConfig.tolerance}
              onChange={(val) => onChangeBgConfig({ enabled: true, tolerance: val })}
            />

            <StudioSlider
              label="Edge Choke / Expand"
              min={-10}
              max={10}
              step={1}
              defaultValue={0}
              value={bgConfig.choke}
              displayValue={bgConfig.choke > 0 ? `+${bgConfig.choke}px` : `${bgConfig.choke}px`}
              hintLeft="Shrink (kill halo)"
              hintRight="Expand"
              onChange={(val) => onChangeBgConfig({ enabled: true, choke: val })}
            />

            <StudioSlider
              label="Edge Softness (Feather)"
              min={0}
              max={20}
              step={1}
              defaultValue={2}
              value={bgConfig.softness}
              displayValue={`${bgConfig.softness}px`}
              onChange={(val) => onChangeBgConfig({ enabled: true, softness: val })}
            />

            <StudioSlider
              label="Edge Contrast Refine"
              min={0}
              max={100}
              step={1}
              defaultValue={30}
              value={bgConfig.edgeContrast}
              displayValue={`${bgConfig.edgeContrast}%`}
              onChange={(val) => onChangeBgConfig({ enabled: true, edgeContrast: val })}
            />

            <StudioSlider
              label="Color Despill (Fringe Removal)"
              min={0}
              max={100}
              step={1}
              defaultValue={25}
              value={bgConfig.despill}
              displayValue={`${bgConfig.despill}%`}
              onChange={(val) => onChangeBgConfig({ enabled: true, despill: val })}
            />

            <StudioSlider
              label="Subject Detail Guard"
              min={0}
              max={100}
              step={1}
              defaultValue={35}
              value={bgConfig.protectDetails}
              displayValue={`${bgConfig.protectDetails}%`}
              onChange={(val) => onChangeBgConfig({ enabled: true, protectDetails: val })}
            />
          </div>

          {/* Manual Touch-up Brush */}
          <div className="space-y-2.5 pt-3 border-t border-white/[0.07]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Manual Touch-Up Brush
              </span>
              {bgConfig.strokes.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeBgConfig({
                        strokes: bgConfig.strokes.slice(0, -1),
                      })
                    }
                    className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeBgConfig({ strokes: [] })}
                    className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onChangeStageTool('pan')}
                className={`min-h-[40px] px-2 rounded-xl border text-[11px] font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                  stageTool === 'pan'
                    ? 'bg-white/[0.12] border-white/30 text-white'
                    : 'bg-[#090B0E] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span>Move</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeBgConfig({ enabled: true });
                  onChangeStageTool('erase');
                }}
                className={`min-h-[40px] px-2 rounded-xl border text-[11px] font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                  stageTool === 'erase'
                    ? 'bg-rose-600/25 border-rose-500 text-rose-100'
                    : 'bg-[#090B0E] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Erase</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeBgConfig({ enabled: true });
                  onChangeStageTool('restore');
                }}
                className={`min-h-[40px] px-2 rounded-xl border text-[11px] font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                  stageTool === 'restore'
                    ? 'bg-emerald-600/25 border-emerald-500 text-emerald-100'
                    : 'bg-[#090B0E] border-white/[0.08] text-slate-400 hover:text-white'
                }`}
              >
                <Brush className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
            </div>

            {(stageTool === 'erase' || stageTool === 'restore') && (
              <StudioSlider
                label="Brush Size"
                min={0.01}
                max={0.14}
                step={0.005}
                value={brushRadius}
                displayValue={`${Math.round(brushRadius * 100)}%`}
                onChange={onChangeBrushRadius}
              />
            )}
          </div>

          {/* Preview Backdrop & Invert & Batch Apply */}
          <div className="space-y-3 pt-3 border-t border-white/[0.07]">
            <div>
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                Preview Backdrop
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {(
                  [
                    { id: 'checker', label: 'Grid' },
                    { id: 'dark', label: 'Dark' },
                    { id: 'light', label: 'White' },
                    { id: 'green', label: 'Green' },
                    { id: 'ruby', label: 'Mask' },
                  ] as { id: BgPreviewBackdrop; label: string }[]
                ).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onChangeBgConfig({ previewBackdrop: b.id })}
                    className={`py-2 text-[11px] font-medium rounded-lg border transition-colors cursor-pointer ${
                      bgConfig.previewBackdrop === b.id
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-[#090B0E] border-white/[0.08] text-slate-400 hover:text-white'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  onChangeBgConfig({ enabled: true, invertMask: !bgConfig.invertMask })
                }
                className={`flex-1 min-h-[42px] px-3 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                  bgConfig.invertMask
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-[#090B0E] border-white/[0.1] text-slate-300 hover:text-white'
                }`}
              >
                <FlipHorizontal2 className="w-3.5 h-3.5" />
                <span>Invert Mask</span>
              </button>
              <button
                type="button"
                onClick={onApplyToAllImages}
                className="flex-1 min-h-[42px] px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-medium text-white cursor-pointer whitespace-nowrap"
              >
                Apply to All
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export { DEFAULT_BG_REMOVAL };
