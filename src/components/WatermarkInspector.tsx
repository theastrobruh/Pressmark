import {
  Award,
  Bookmark,
  Copy,
  Download,
  Eye,
  EyeOff,
  Grid3X3,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { WATERMARK_FONTS } from '../constants/presets';
import {
  BadgeStyle,
  BlendMode,
  PlacementMode,
  WatermarkLayer,
  WatermarkPreset,
} from '../types/studio';

interface WatermarkInspectorProps {
  layers: WatermarkLayer[];
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onAddLayer: (type: 'text' | 'image' | 'badge') => void;
  onDuplicateLayer: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  onUpdateLayer: (id: string, patch: Partial<WatermarkLayer>) => void;
  onCommitLastPlaced: () => void;
  presets: WatermarkPreset[];
  activePresetId: string | null;
  onApplyPreset: (preset: WatermarkPreset) => void;
  onSavePreset: (name: string, includeResizeFormat: boolean) => void;
  onDeletePreset: (id: string) => void;
  onImportPresets: (jsonText: string) => void;
}

const QUICK_COLORS = ['#ffffff', '#000000', '#f8fafc', '#e2e8f0', '#f59e0b', '#3b82f6'];

const ANCHOR_POINTS = [
  { id: 'tl', x: 0.14, y: 0.1, label: 'Top Left' },
  { id: 'tc', x: 0.5, y: 0.1, label: 'Top Center' },
  { id: 'tr', x: 0.86, y: 0.1, label: 'Top Right' },
  { id: 'ml', x: 0.14, y: 0.5, label: 'Mid Left' },
  { id: 'c', x: 0.5, y: 0.5, label: 'Center' },
  { id: 'mr', x: 0.86, y: 0.5, label: 'Mid Right' },
  { id: 'bl', x: 0.14, y: 0.9, label: 'Bottom Left' },
  { id: 'bc', x: 0.5, y: 0.9, label: 'Bottom Center' },
  { id: 'br', x: 0.86, y: 0.9, label: 'Bottom Right' },
];

export function WatermarkInspector({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDuplicateLayer,
  onRemoveLayer,
  onUpdateLayer,
  onCommitLastPlaced,
  presets,
  activePresetId,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onImportPresets,
}: WatermarkInspectorProps) {
  const [section, setSection] = useState<'presets' | 'style' | 'position'>('style');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [includeResizeInPreset, setIncludeResizeInPreset] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const presetImportRef = useRef<HTMLInputElement>(null);

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0] || null;

  const handleLogoUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (activeLayer && activeLayer.type === 'image') {
        onUpdateLayer(activeLayer.id, {
          imageUrl: url,
          imageName: file.name,
          imageWidth: img.naturalWidth,
          imageHeight: img.naturalHeight,
        });
        onCommitLastPlaced();
      }
    };
    img.src = url;
  };

  const snapToAnchor = (ax: number, ay: number) => {
    if (!activeLayer) return;
    const m = activeLayer.marginPct;
    const area = activeLayer.customArea;

    const minX = area.enabled ? area.x : 0;
    const minY = area.enabled ? area.y : 0;
    const w = area.enabled ? area.width : 1;
    const h = area.enabled ? area.height : 1;

    const mappedX =
      ax < 0.3
        ? minX + w * Math.max(0.06, m + 0.06)
        : ax > 0.7
          ? minX + w * (1 - Math.max(0.06, m + 0.06))
          : minX + w * 0.5;
    const mappedY =
      ay < 0.3
        ? minY + h * Math.max(0.06, m + 0.04)
        : ay > 0.7
          ? minY + h * (1 - Math.max(0.06, m + 0.04))
          : minY + h * 0.5;

    onUpdateLayer(activeLayer.id, {
      x: Number(mappedX.toFixed(4)),
      y: Number(mappedY.toFixed(4)),
    });
    onCommitLastPlaced();
  };

  const handleExportPresetsJson = () => {
    const custom = presets.filter((p) => !p.isBuiltIn);
    const data = JSON.stringify(custom.length > 0 ? custom : presets, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pressmark_presets.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <aside className="w-full lg:w-[368px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#12151B] flex flex-col overflow-hidden">
      {/* Layers Header & Quick Add */}
      <div className="p-4 border-b border-white/[0.08] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Watermark Layers
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onAddLayer('text')}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => onAddLayer('image')}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              <span>Logo</span>
            </button>
            <button
              type="button"
              onClick={() => onAddLayer('badge')}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3 h-3" />
              <span>Stamp</span>
            </button>
          </div>
        </div>

        {/* Layer Stack List */}
        <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
          {layers.map((layer) => {
            const isActive = layer.id === activeLayer?.id;
            const Icon =
              layer.type === 'image' ? ImageIcon : layer.type === 'badge' ? Award : Type;
            const label =
              layer.type === 'text'
                ? layer.text || 'Text Watermark'
                : layer.type === 'image'
                  ? layer.imageName || 'Logo Watermark'
                  : layer.badgePrimary || 'Studio Stamp';

            return (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectLayer(layer.id);
                  }
                }}
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/15 border-blue-500/40 text-white'
                    : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateLayer(layer.id, { visible: !layer.visible });
                      onCommitLastPlaced();
                    }}
                    className="p-1 rounded hover:bg-white/[0.08] text-slate-400 hover:text-white cursor-pointer"
                  >
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    aria-label="Duplicate layer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateLayer(layer.id);
                    }}
                    className="p-1 rounded hover:bg-white/[0.08] text-slate-400 hover:text-white cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {layers.length > 1 && (
                    <button
                      type="button"
                      aria-label="Delete layer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveLayer(layer.id);
                      }}
                      className="p-1 rounded hover:bg-white/[0.08] text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspector Sub-Tabs */}
      <div className="px-4 py-2 border-b border-white/[0.08] flex items-center gap-1 bg-[#0E1014]">
        {(
          [
            { id: 'style', label: 'Appearance & Fonts' },
            { id: 'position', label: 'Placement & Area' },
            { id: 'presets', label: 'Saved Presets' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id)}
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              section === tab.id
                ? 'bg-[#1D222B] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {section === 'presets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-white">Watermark Presets</h3>
                <p className="text-[11px] text-slate-400">
                  Save recurring placements &amp; styles for 1-click batch use.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save New</span>
              </button>
            </div>

            {showSaveForm && (
              <div className="p-3 rounded-lg bg-[#0B0D10] border border-white/[0.1] space-y-2.5">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name (e.g. IG Reels Handle)"
                  className="w-full px-3 py-1.5 text-xs bg-[#161A22] border border-white/[0.1] rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
                <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeResizeInPreset}
                    onChange={(e) => setIncludeResizeInPreset(e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <span>Also remember resize &amp; output format</span>
                </label>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!presetName.trim()}
                    onClick={() => {
                      onSavePreset(presetName.trim(), includeResizeInPreset);
                      setPresetName('');
                      setShowSaveForm(false);
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white cursor-pointer"
                  >
                    Save Preset
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {presets.map((preset) => {
                const isSelected = preset.id === activePresetId;
                return (
                  <div
                    key={preset.id}
                    onClick={() => onApplyPreset(preset)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onApplyPreset(preset);
                      }
                    }}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/40'
                        : 'bg-[#0B0D10]/70 border-white/[0.08] hover:border-white/[0.16]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Bookmark className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-xs font-semibold text-white truncate">
                            {preset.name}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400 leading-snug">
                          {preset.description}
                        </p>
                        <div className="mt-1.5 text-[11px] font-mono text-slate-500">
                          {preset.layers.length} {preset.layers.length === 1 ? 'layer' : 'layers'}
                          {preset.format ? ` · ${preset.format.outputFormat.replace('image/', '').toUpperCase()}` : ''}
                        </div>
                      </div>
                      {!preset.isBuiltIn && (
                        <button
                          type="button"
                          aria-label={`Delete ${preset.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePreset(preset.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Backup / Restore JSON */}
            <div className="pt-3 border-t border-white/[0.07] flex items-center gap-2">
              <input
                ref={presetImportRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    file.text().then(onImportPresets);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={handleExportPresetsJson}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={() => presetImportRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
              </button>
            </div>
          </div>
        )}

        {section === 'position' && activeLayer && (
          <div className="space-y-5">
            {/* Placement Mode */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Placement Mode
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#0B0D10] border border-white/[0.08]">
                {(
                  [
                    { id: 'single', label: 'Single' },
                    { id: 'tiled', label: 'Tiled Grid' },
                    { id: 'corners', label: 'Dual Corners' },
                  ] as { id: PlacementMode; label: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      onUpdateLayer(activeLayer.id, { placementMode: mode.id });
                      onCommitLastPlaced();
                    }}
                    className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      activeLayer.placementMode === mode.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 9-Point Quick Anchor Snap */}
            {activeLayer.placementMode === 'single' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Quick Anchor</span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {Math.round(activeLayer.x * 100)}% , {Math.round(activeLayer.y * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-[#0B0D10] border border-white/[0.08]">
                  {ANCHOR_POINTS.map((pt) => {
                    const isNear =
                      Math.abs(activeLayer.x - pt.x) < 0.08 &&
                      Math.abs(activeLayer.y - pt.y) < 0.08;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        title={pt.label}
                        onClick={() => snapToAnchor(pt.x, pt.y)}
                        className={`h-8 rounded flex items-center justify-center text-[11px] font-mono transition-colors cursor-pointer ${
                          isNear
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white'
                        }`}
                      >
                        {pt.id.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tiled Controls */}
            {activeLayer.placementMode === 'tiled' && (
              <div className="space-y-3 p-3 rounded-lg bg-[#0B0D10] border border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Grid3X3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Pattern Spacing &amp; Angle</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Tile Spacing</span>
                    <span className="font-mono">{activeLayer.tileSpacing.toFixed(1)}×</span>
                  </div>
                  <input
                    type="range"
                    min={1.1}
                    max={4.0}
                    step={0.1}
                    value={activeLayer.tileSpacing}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, { tileSpacing: parseFloat(e.target.value) })
                    }
                    onPointerUp={onCommitLastPlaced}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Grid Diagonal Angle</span>
                    <span className="font-mono">{activeLayer.tileAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    step={1}
                    value={activeLayer.tileAngle}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, { tileAngle: parseInt(e.target.value, 10) })
                    }
                    onPointerUp={onCommitLastPlaced}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Custom Area Safe Zone */}
            <div className="space-y-3 pt-3 border-t border-white/[0.07]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-white">Custom Area Region</div>
                  <div className="text-[11px] text-slate-400">
                    Restrict placement or tiling inside a custom box on the canvas.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={activeLayer.customArea.enabled}
                  onChange={(e) => {
                    onUpdateLayer(activeLayer.id, {
                      customArea: { ...activeLayer.customArea, enabled: e.target.checked },
                    });
                    onCommitLastPlaced();
                  }}
                  className="w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
                />
              </div>

              {activeLayer.customArea.enabled && (
                <div className="p-3 rounded-lg bg-[#0B0D10] border border-blue-500/30 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-blue-300">
                    <span>Drag handles directly on canvas</span>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateLayer(activeLayer.id, {
                          customArea: {
                            enabled: true,
                            x: 0.1,
                            y: 0.1,
                            width: 0.8,
                            height: 0.8,
                          },
                        });
                        onCommitLastPlaced();
                      }}
                      className="inline-flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block">X%</span>
                      <span className="text-slate-200">
                        {Math.round(activeLayer.customArea.x * 100)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Y%</span>
                      <span className="text-slate-200">
                        {Math.round(activeLayer.customArea.y * 100)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">W%</span>
                      <span className="text-slate-200">
                        {Math.round(activeLayer.customArea.width * 100)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">H%</span>
                      <span className="text-slate-200">
                        {Math.round(activeLayer.customArea.height * 100)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transform Sliders */}
            <div className="space-y-3 pt-3 border-t border-white/[0.07]">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Scale</span>
                  <span className="font-mono text-slate-400">
                    {Math.round(activeLayer.scale * 100)}%
                  </span>
                </div>
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
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Opacity</span>
                  <span className="font-mono text-slate-400">
                    {Math.round(activeLayer.opacity * 100)}%
                  </span>
                </div>
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
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Rotation</span>
                  <span className="font-mono text-slate-400">{activeLayer.rotation}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={activeLayer.rotation}
                  onChange={(e) =>
                    onUpdateLayer(activeLayer.id, { rotation: parseInt(e.target.value, 10) })
                  }
                  onPointerUp={onCommitLastPlaced}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5">Blend Mode</label>
                <select
                  value={activeLayer.blendMode}
                  onChange={(e) => {
                    onUpdateLayer(activeLayer.id, { blendMode: e.target.value as BlendMode });
                    onCommitLastPlaced();
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-[#0B0D10] border border-white/[0.1] rounded-md text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="source-over">Normal</option>
                  <option value="multiply">Multiply (Darken)</option>
                  <option value="screen">Screen (Lighten)</option>
                  <option value="overlay">Overlay (Contrast)</option>
                  <option value="soft-light">Soft Light (Subtle)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {section === 'style' && activeLayer && (
          <div className="space-y-5">
            {activeLayer.type === 'text' && (
              <>
                {/* Watermark Text + Token Inserts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Watermark Text
                    </label>
                    <div className="flex items-center gap-1">
                      {['{year}', '{date}', '{filename}'].map((tok) => (
                        <button
                          key={tok}
                          type="button"
                          onClick={() => {
                            onUpdateLayer(activeLayer.id, {
                              text: `${activeLayer.text} ${tok}`.trim(),
                            });
                            onCommitLastPlaced();
                          }}
                          className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 cursor-pointer"
                        >
                          +{tok}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={activeLayer.text}
                    onChange={(e) => onUpdateLayer(activeLayer.id, { text: e.target.value })}
                    onBlur={onCommitLastPlaced}
                    placeholder="Enter handle, copyright, or domain..."
                    className="w-full px-3 py-2 text-sm bg-[#0B0D10] border border-white/[0.1] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Font Library Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Font Family ({WATERMARK_FONTS.length} Fonts)
                  </label>
                  <div className="max-h-44 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0B0D10] divide-y divide-white/[0.05]">
                    {WATERMARK_FONTS.map((font) => {
                      const isSelected = activeLayer.fontFamily === font.family;
                      return (
                        <button
                          key={font.name}
                          type="button"
                          onClick={() => {
                            onUpdateLayer(activeLayer.id, { fontFamily: font.family });
                            onCommitLastPlaced();
                          }}
                          className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/20 text-white'
                              : 'hover:bg-white/[0.04] text-slate-300'
                          }`}
                        >
                          <span style={{ fontFamily: font.family }} className="text-sm truncate">
                            {font.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">
                            {font.category}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Weight, Italic, Tracking */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Weight</label>
                    <select
                      value={activeLayer.fontWeight}
                      onChange={(e) => {
                        onUpdateLayer(activeLayer.id, {
                          fontWeight: parseInt(e.target.value, 10),
                        });
                        onCommitLastPlaced();
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#0B0D10] border border-white/[0.1] rounded-md text-white"
                    >
                      <option value={400}>Regular (400)</option>
                      <option value={500}>Medium (500)</option>
                      <option value={600}>SemiBold (600)</option>
                      <option value={700}>Bold (700)</option>
                      <option value={800}>ExtraBold (800)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Style</label>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateLayer(activeLayer.id, { italic: !activeLayer.italic });
                        onCommitLastPlaced();
                      }}
                      className={`w-full py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                        activeLayer.italic
                          ? 'bg-blue-600/20 border-blue-500/50 text-white italic'
                          : 'bg-[#0B0D10] border-white/[0.1] text-slate-300'
                      }`}
                    >
                      {activeLayer.italic ? 'Italic On' : 'Normal Upright'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Letter Spacing</span>
                    <span className="font-mono text-slate-400">
                      {(activeLayer.letterSpacing * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-0.04}
                    max={0.45}
                    step={0.01}
                    value={activeLayer.letterSpacing}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, {
                        letterSpacing: parseFloat(e.target.value),
                      })
                    }
                    onPointerUp={onCommitLastPlaced}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                {/* Color Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Text Color</label>
                  <div className="flex items-center gap-2">
                    {QUICK_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Color ${hex}`}
                        onClick={() => {
                          onUpdateLayer(activeLayer.id, { color: hex });
                          onCommitLastPlaced();
                        }}
                        style={{ backgroundColor: hex }}
                        className={`w-6 h-6 rounded-full border cursor-pointer ${
                          activeLayer.color.toLowerCase() === hex
                            ? 'ring-2 ring-blue-500 border-white'
                            : 'border-white/20'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      value={activeLayer.color}
                      onChange={(e) => onUpdateLayer(activeLayer.id, { color: e.target.value })}
                      onBlur={onCommitLastPlaced}
                      className="w-7 h-7 rounded bg-transparent border border-white/20 cursor-pointer ml-auto"
                    />
                  </div>
                </div>

                {/* Opacity + Scale quick access */}
                <div className="space-y-3 pt-2 border-t border-white/[0.07]">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Opacity</span>
                      <span className="font-mono text-slate-400">
                        {Math.round(activeLayer.opacity * 100)}%
                      </span>
                    </div>
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
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Size</span>
                      <span className="font-mono text-slate-400">
                        {Math.round(activeLayer.scale * 100)}%
                      </span>
                    </div>
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
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Effects: Backdrop Box, Shadow, Outline */}
                <div className="space-y-3 pt-3 border-t border-white/[0.07]">
                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
                    <span className="font-medium">Backdrop Box</span>
                    <input
                      type="checkbox"
                      checked={activeLayer.boxEnabled}
                      onChange={(e) => {
                        onUpdateLayer(activeLayer.id, { boxEnabled: e.target.checked });
                        onCommitLastPlaced();
                      }}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </label>
                  {activeLayer.boxEnabled && (
                    <div className="p-3 rounded-lg bg-[#0B0D10] border border-white/[0.08] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Box Fill</span>
                        <input
                          type="color"
                          value={activeLayer.boxColor}
                          onChange={(e) =>
                            onUpdateLayer(activeLayer.id, { boxColor: e.target.value })
                          }
                          className="w-6 h-6 rounded bg-transparent border border-white/20 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Box Opacity</span>
                          <span className="font-mono">
                            {Math.round(activeLayer.boxOpacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={activeLayer.boxOpacity}
                          onChange={(e) =>
                            onUpdateLayer(activeLayer.id, {
                              boxOpacity: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-blue-500 cursor-pointer"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Padding</span>
                          <input
                            type="range"
                            min={4}
                            max={32}
                            value={activeLayer.boxPadding}
                            onChange={(e) =>
                              onUpdateLayer(activeLayer.id, {
                                boxPadding: parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full accent-blue-500 cursor-pointer"
                          />
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Radius</span>
                          <input
                            type="range"
                            min={0}
                            max={24}
                            value={activeLayer.boxRadius}
                            onChange={(e) =>
                              onUpdateLayer(activeLayer.id, {
                                boxRadius: parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full accent-blue-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
                    <span className="font-medium">Drop Shadow</span>
                    <input
                      type="checkbox"
                      checked={activeLayer.shadowEnabled}
                      onChange={(e) => {
                        onUpdateLayer(activeLayer.id, { shadowEnabled: e.target.checked });
                        onCommitLastPlaced();
                      }}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
                    <span className="font-medium">Text Outline</span>
                    <input
                      type="checkbox"
                      checked={activeLayer.strokeEnabled}
                      onChange={(e) => {
                        onUpdateLayer(activeLayer.id, { strokeEnabled: e.target.checked });
                        onCommitLastPlaced();
                      }}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                  </label>
                </div>
              </>
            )}

            {activeLayer.type === 'image' && (
              <div className="space-y-4">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogoUpload(f);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-lg border border-dashed border-white/20 hover:border-blue-500 bg-[#0B0D10] text-xs font-medium text-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>
                    {activeLayer.imageUrl ? 'Replace Logo Image' : 'Upload Transparent PNG / SVG Logo'}
                  </span>
                </button>

                {activeLayer.imageUrl && (
                  <div className="p-3 rounded-lg bg-[#0B0D10] border border-white/[0.08] flex items-center gap-3">
                    <img
                      src={activeLayer.imageUrl}
                      alt="Logo preview"
                      className="w-12 h-12 object-contain checkerboard-bg rounded border border-white/10"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">
                        {activeLayer.imageName || 'Uploaded Logo'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {activeLayer.imageWidth}×{activeLayer.imageHeight}
                      </div>
                    </div>
                  </div>
                )}

                <label className="flex items-center justify-between text-xs text-slate-200 cursor-pointer">
                  <span>Invert Logo Colors (Black ↔ White)</span>
                  <input
                    type="checkbox"
                    checked={activeLayer.invertColors}
                    onChange={(e) => {
                      onUpdateLayer(activeLayer.id, {
                        invertColors: e.target.checked,
                        tintColor: undefined,
                      });
                      onCommitLastPlaced();
                    }}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Monochrome Tint</span>
                    {activeLayer.tintColor && (
                      <button
                        type="button"
                        onClick={() => onUpdateLayer(activeLayer.id, { tintColor: undefined })}
                        className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                      >
                        Reset Original
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {['#ffffff', '#000000', '#3b82f6', '#f59e0b'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => {
                          onUpdateLayer(activeLayer.id, { tintColor: hex, invertColors: false });
                          onCommitLastPlaced();
                        }}
                        style={{ backgroundColor: hex }}
                        className={`w-6 h-6 rounded-full border cursor-pointer ${
                          activeLayer.tintColor === hex
                            ? 'ring-2 ring-blue-500 border-white'
                            : 'border-white/20'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/[0.07]">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Scale</span>
                      <span className="font-mono text-slate-400">
                        {Math.round(activeLayer.scale * 100)}%
                      </span>
                    </div>
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
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Opacity</span>
                      <span className="font-mono text-slate-400">
                        {Math.round(activeLayer.opacity * 100)}%
                      </span>
                    </div>
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
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeLayer.type === 'badge' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    Stamp Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'exif-bar', label: 'EXIF Bar' },
                        { id: 'copyright-ring', label: 'Seal Ring' },
                        { id: 'corner-tag', label: 'Corner Tag' },
                        { id: 'minimal-frame', label: 'Editorial Box' },
                      ] as { id: BadgeStyle; label: string }[]
                    ).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          onUpdateLayer(activeLayer.id, { badgeStyle: s.id });
                          onCommitLastPlaced();
                        }}
                        className={`py-2 px-3 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                          activeLayer.badgeStyle === s.id
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'bg-[#0B0D10] border-white/[0.08] text-slate-300 hover:border-white/20'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-300 block">Primary Label</label>
                  <input
                    type="text"
                    value={activeLayer.badgePrimary}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, { badgePrimary: e.target.value })
                    }
                    onBlur={onCommitLastPlaced}
                    className="w-full px-3 py-1.5 text-xs bg-[#0B0D10] border border-white/[0.1] rounded-md text-white"
                  />
                  <label className="text-xs text-slate-300 block">Secondary Label</label>
                  <input
                    type="text"
                    value={activeLayer.badgeSecondary}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, { badgeSecondary: e.target.value })
                    }
                    onBlur={onCommitLastPlaced}
                    className="w-full px-3 py-1.5 text-xs bg-[#0B0D10] border border-white/[0.1] rounded-md text-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-300">Foreground Color</span>
                  <input
                    type="color"
                    value={activeLayer.color}
                    onChange={(e) => onUpdateLayer(activeLayer.id, { color: e.target.value })}
                    className="w-7 h-7 rounded bg-transparent border border-white/20 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Scale</span>
                    <span className="font-mono text-slate-400">
                      {Math.round(activeLayer.scale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.08}
                    max={0.65}
                    step={0.01}
                    value={activeLayer.scale}
                    onChange={(e) =>
                      onUpdateLayer(activeLayer.id, { scale: parseFloat(e.target.value) })
                    }
                    onPointerUp={onCommitLastPlaced}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
