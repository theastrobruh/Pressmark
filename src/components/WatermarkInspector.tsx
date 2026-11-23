import {
  Award,
  Bookmark,
  ChevronDown,
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
import { FontOption, WATERMARK_FONTS } from '../constants/presets';
import {
  BadgeStyle,
  BlendMode,
  PlacementMode,
  WatermarkLayer,
  WatermarkPreset,
} from '../types/studio';
import { StudioSegmented, StudioSlider, StudioSwitch } from './StudioControls';

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

const QUICK_COLORS = ['#ffffff', '#000000', '#f8fafc', '#cbd5e1', '#f59e0b', '#3b82f6'];

const ANCHOR_POINTS = [
  { id: 'tl', x: 0.14, y: 0.1, label: 'Top Left' },
  { id: 'tc', x: 0.5, y: 0.1, label: 'Top Center' },
  { id: 'tr', x: 0.86, y: 0.1, label: 'Top Right' },
  { id: 'ml', x: 0.14, y: 0.5, label: 'Mid Left' },
  { id: 'c', x: 0.5, y: 0.5, label: 'Center' },
  { id: 'mr', x: 0.86, y: 0.5, label: 'Mid Right' },
  { id: 'bl', x: 0.14, y: 0.91, label: 'Bottom Left' },
  { id: 'bc', x: 0.5, y: 0.91, label: 'Bottom Center' },
  { id: 'br', x: 0.86, y: 0.91, label: 'Bottom Right' },
];

const FONT_CATEGORIES: ('All' | FontOption['category'])[] = [
  'All',
  'Sans',
  'Serif',
  'Display',
  'Script',
  'Mono',
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
  const [openGroups, setOpenGroups] = useState({
    presets: false,
    layers: true,
    appearance: true,
    placement: true,
    effects: false,
  });
  const [fontCategory, setFontCategory] = useState<'All' | FontOption['category']>('All');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [includeResizeInPreset, setIncludeResizeInPreset] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const presetImportRef = useRef<HTMLInputElement>(null);

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0] || null;

  const filteredFonts =
    fontCategory === 'All'
      ? WATERMARK_FONTS
      : WATERMARK_FONTS.filter((f) => f.category === fontCategory);

  const toggleGroup = (key: keyof typeof openGroups) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
          ? minY + h * (1 - Math.max(0.05, m + 0.04))
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
    <aside className="w-full flex-1 min-h-0 lg:w-[388px] lg:flex-none shrink-0 bg-[#11141B] lg:border-l border-white/[0.08] flex flex-col overflow-hidden">
      {/* Always-accessible Visual Preset Strip */}
      <div className="p-3.5 border-b border-white/[0.08] space-y-2.5 bg-[#0E1117]">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => toggleGroup('presets')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-blue-400" />
            <span>Quick Presets</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                openGroups.presets ? 'rotate-180' : ''
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setOpenGroups((prev) => ({ ...prev, presets: true }));
              setShowSaveForm((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/35 text-blue-200 cursor-pointer whitespace-nowrap transition-colors"
          >
            <Save className="w-3 h-3" />
            <span>Save Look</span>
          </button>
        </div>

        {/* Horizontal Preset Cards */}
        <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
          {presets.map((preset) => {
            const isSelected = preset.id === activePresetId;
            const first = preset.layers[0];
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset)}
                className={`px-3 py-2 rounded-xl border text-left whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.3)]'
                    : 'bg-[#090B0E] border-white/[0.08] text-slate-300 hover:border-white/25 hover:bg-white/[0.03]'
                }`}
              >
                {/* Mini Visual Position Preview Box */}
                <span className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/[0.1] relative shrink-0 block">
                  {first?.placementMode === 'tiled' ? (
                    <span className="absolute inset-1 border border-dashed border-blue-400/70 rounded-[2px]" />
                  ) : (
                    <span
                      style={{
                        left: `${Math.max(15, Math.min(85, (first?.x ?? 0.5) * 100))}%`,
                        top: `${Math.max(15, Math.min(85, (first?.y ?? 0.9) * 100))}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-1 rounded-full bg-blue-400"
                    />
                  )}
                </span>
                <span className="text-[11px] font-medium">{preset.name}</span>
              </button>
            );
          })}
        </div>

        {openGroups.presets && (
          <div className="pt-2 space-y-2.5 border-t border-white/[0.07]">
            {showSaveForm && (
              <div className="p-3 rounded-xl bg-[#090B0E] border border-white/[0.1] space-y-2.5">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name (e.g. IG Reels)"
                  className="w-full px-3 py-2 text-xs bg-[#151922] border border-white/[0.1] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
                <StudioSwitch
                  label="Include resize & format"
                  checked={includeResizeInPreset}
                  onChange={setIncludeResizeInPreset}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
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
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white cursor-pointer"
                  >
                    Save Preset
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
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
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-medium rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={() => presetImportRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-[11px] font-medium rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Import JSON</span>
              </button>
              {activePresetId && !presets.find((p) => p.id === activePresetId)?.isBuiltIn && (
                <button
                  type="button"
                  onClick={() => onDeletePreset(activePresetId)}
                  aria-label="Delete selected preset"
                  className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Unified Scrollable Accordion Controls */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.07]">
        {/* 1. LAYERS */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => toggleGroup('layers')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white cursor-pointer"
            >
              <span>Layers ({layers.length})</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  openGroups.layers ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAddLayer('text')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.06] text-slate-200 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Text</span>
              </button>
              <button
                type="button"
                onClick={() => onAddLayer('image')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.06] text-slate-200 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Logo</span>
              </button>
              <button
                type="button"
                onClick={() => onAddLayer('badge')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.06] text-slate-200 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Stamp</span>
              </button>
            </div>
          </div>

          {openGroups.layers && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
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
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-colors cursor-pointer min-h-[42px] ${
                      isActive
                        ? 'bg-blue-600/15 border-blue-500/40 text-white'
                        : 'bg-[#090B0E]/60 border-transparent hover:bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
                        className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white cursor-pointer"
                      >
                        {layer.visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="Duplicate layer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateLayer(layer.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white cursor-pointer"
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
                          className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. CONTENT & STYLE */}
        {activeLayer && (
          <div className="p-4 space-y-4">
            <button
              type="button"
              onClick={() => toggleGroup('appearance')}
              className="w-full flex items-center justify-between text-xs font-semibold text-white cursor-pointer"
            >
              <span>
                {activeLayer.type === 'text'
                  ? 'Text, Fonts & Color'
                  : activeLayer.type === 'image'
                    ? 'Logo Image & Tint'
                    : 'Stamp Style & Labels'}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  openGroups.appearance ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openGroups.appearance && (
              <div className="space-y-4 pt-1">
                {activeLayer.type === 'text' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Watermark Text</span>
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
                        onChange={(e) =>
                          onUpdateLayer(activeLayer.id, { text: e.target.value })
                        }
                        onBlur={onCommitLastPlaced}
                        className="w-full px-3 py-2 text-sm bg-[#090B0E] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-blue-500 resize-none"
                      />
                    </div>

                    {/* Font Family with Category Filters & Live Text Preview */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-400">
                          Typeface ({filteredFonts.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                        {FONT_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFontCategory(cat)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              fontCategory === cat
                                ? 'bg-blue-600 text-white'
                                : 'bg-[#090B0E] text-slate-400 hover:text-white border border-white/[0.07]'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="max-h-44 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#090B0E] divide-y divide-white/[0.05]">
                        {filteredFonts.map((font) => {
                          const isSelected = activeLayer.fontFamily === font.family;
                          const sampleText =
                            activeLayer.text.split('\n')[0]?.trim() || '@Pressmark_webapp';
                          return (
                            <button
                              key={font.name}
                              type="button"
                              onClick={() => {
                                onUpdateLayer(activeLayer.id, { fontFamily: font.family });
                                onCommitLastPlaced();
                              }}
                              className={`w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer min-h-[42px] ${
                                isSelected
                                  ? 'bg-blue-600/20 text-white'
                                  : 'hover:bg-white/[0.04] text-slate-200'
                              }`}
                            >
                              <span
                                style={{ fontFamily: font.family }}
                                className="text-sm truncate"
                              >
                                {sampleText}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                {font.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Weight & Italic */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <select
                        value={activeLayer.fontWeight}
                        onChange={(e) => {
                          onUpdateLayer(activeLayer.id, {
                            fontWeight: parseInt(e.target.value, 10),
                          });
                          onCommitLastPlaced();
                        }}
                        className="px-3 py-2 text-xs bg-[#090B0E] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value={400}>Regular (400)</option>
                        <option value={500}>Medium (500)</option>
                        <option value={600}>SemiBold (600)</option>
                        <option value={700}>Bold (700)</option>
                        <option value={800}>ExtraBold (800)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateLayer(activeLayer.id, { italic: !activeLayer.italic });
                          onCommitLastPlaced();
                        }}
                        className={`py-2 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
                          activeLayer.italic
                            ? 'bg-blue-600/20 border-blue-500/50 text-white italic'
                            : 'bg-[#090B0E] border-white/[0.1] text-slate-300'
                        }`}
                      >
                        {activeLayer.italic ? 'Italic On' : 'Upright'}
                      </button>
                    </div>

                    {/* Color Swatches */}
                    <div className="flex items-center gap-2 pt-1">
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
                          className={`w-7 h-7 rounded-full border cursor-pointer transition-transform hover:scale-105 ${
                            activeLayer.color.toLowerCase() === hex
                              ? 'ring-2 ring-blue-500 border-white scale-105'
                              : 'border-white/20'
                          }`}
                        />
                      ))}
                      <input
                        type="color"
                        value={activeLayer.color}
                        onChange={(e) =>
                          onUpdateLayer(activeLayer.id, { color: e.target.value })
                        }
                        onBlur={onCommitLastPlaced}
                        className="w-8 h-8 rounded-lg bg-transparent border border-white/20 cursor-pointer ml-auto"
                      />
                    </div>
                  </>
                )}

                {activeLayer.type === 'image' && (
                  <div className="space-y-3">
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
                      className="w-full py-3 px-4 rounded-xl border border-dashed border-white/20 hover:border-blue-500 bg-[#090B0E] text-xs font-medium text-slate-200 flex items-center justify-center gap-2 cursor-pointer min-h-[46px]"
                    >
                      <Upload className="w-4 h-4 text-blue-400" />
                      <span>
                        {activeLayer.imageUrl ? 'Replace Logo PNG/SVG' : 'Upload Logo PNG / SVG'}
                      </span>
                    </button>

                    <StudioSwitch
                      label="Invert Colors (Black ↔ White)"
                      checked={activeLayer.invertColors}
                      onChange={(checked) => {
                        onUpdateLayer(activeLayer.id, {
                          invertColors: checked,
                          tintColor: undefined,
                        });
                        onCommitLastPlaced();
                      }}
                    />
                  </div>
                )}

                {activeLayer.type === 'badge' && (
                  <div className="space-y-3">
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
                          className={`py-2 px-3 text-xs font-medium rounded-xl border cursor-pointer min-h-[40px] ${
                            activeLayer.badgeStyle === s.id
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : 'bg-[#090B0E] border-white/[0.08] text-slate-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={activeLayer.badgePrimary}
                      onChange={(e) =>
                        onUpdateLayer(activeLayer.id, { badgePrimary: e.target.value })
                      }
                      onBlur={onCommitLastPlaced}
                      placeholder="Primary stamp text"
                      className="w-full px-3 py-2 text-xs bg-[#090B0E] border border-white/[0.1] rounded-xl text-white"
                    />
                    <input
                      type="text"
                      value={activeLayer.badgeSecondary}
                      onChange={(e) =>
                        onUpdateLayer(activeLayer.id, { badgeSecondary: e.target.value })
                      }
                      onBlur={onCommitLastPlaced}
                      placeholder="Secondary label"
                      className="w-full px-3 py-2 text-xs bg-[#090B0E] border border-white/[0.1] rounded-xl text-white"
                    />
                  </div>
                )}

                {/* Tactile Opacity & Size Sliders */}
                <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                  <StudioSlider
                    label="Opacity"
                    min={0.05}
                    max={1}
                    step={0.01}
                    defaultValue={0.77}
                    value={activeLayer.opacity}
                    displayValue={`${Math.round(activeLayer.opacity * 100)}%`}
                    onChange={(val) => onUpdateLayer(activeLayer.id, { opacity: val })}
                    onCommit={onCommitLastPlaced}
                  />
                  <StudioSlider
                    label="Size"
                    min={0.05}
                    max={0.85}
                    step={0.01}
                    defaultValue={0.22}
                    value={activeLayer.scale}
                    displayValue={`${Math.round(activeLayer.scale * 100)}%`}
                    onChange={(val) => onUpdateLayer(activeLayer.id, { scale: val })}
                    onCommit={onCommitLastPlaced}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. PLACEMENT, TILING & CUSTOM AREA */}
        {activeLayer && (
          <div className="p-4 space-y-3.5">
            <button
              type="button"
              onClick={() => toggleGroup('placement')}
              className="w-full flex items-center justify-between text-xs font-semibold text-white cursor-pointer"
            >
              <span>Position, Tiling &amp; Custom Area</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  openGroups.placement ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openGroups.placement && (
              <div className="space-y-4 pt-1">
                <StudioSegmented<PlacementMode>
                  value={activeLayer.placementMode}
                  options={[
                    { id: 'single', label: 'Single' },
                    { id: 'tiled', label: 'Tiled Grid' },
                    { id: 'corners', label: 'Dual Corners' },
                  ]}
                  onChange={(mode) => {
                    onUpdateLayer(activeLayer.id, { placementMode: mode });
                    onCommitLastPlaced();
                  }}
                />

                {activeLayer.placementMode === 'single' && (
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-[#090B0E] border border-white/[0.08]">
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
                          className={`h-9 rounded-lg flex items-center justify-center text-[11px] font-mono transition-colors cursor-pointer ${
                            isNear
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white'
                          }`}
                        >
                          {pt.id.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeLayer.placementMode === 'tiled' && (
                  <div className="space-y-3 p-3 rounded-xl bg-[#090B0E] border border-white/[0.08]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <Grid3X3 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Pattern Spacing &amp; Angle</span>
                    </div>
                    <StudioSlider
                      label="Tile Spacing"
                      min={1.1}
                      max={4.0}
                      step={0.1}
                      defaultValue={2.2}
                      value={activeLayer.tileSpacing}
                      displayValue={`${activeLayer.tileSpacing.toFixed(1)}×`}
                      onChange={(val) => onUpdateLayer(activeLayer.id, { tileSpacing: val })}
                      onCommit={onCommitLastPlaced}
                    />
                    <StudioSlider
                      label="Grid Angle"
                      min={-60}
                      max={60}
                      step={1}
                      defaultValue={-28}
                      value={activeLayer.tileAngle}
                      displayValue={`${activeLayer.tileAngle}°`}
                      onChange={(val) => onUpdateLayer(activeLayer.id, { tileAngle: val })}
                      onCommit={onCommitLastPlaced}
                    />
                  </div>
                )}

                <StudioSlider
                  label="Rotation"
                  min={-180}
                  max={180}
                  step={1}
                  defaultValue={0}
                  value={activeLayer.rotation}
                  displayValue={`${activeLayer.rotation}°`}
                  onChange={(val) => onUpdateLayer(activeLayer.id, { rotation: val })}
                  onCommit={onCommitLastPlaced}
                />

                {/* Custom Area Toggle */}
                <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
                  <StudioSwitch
                    label="Custom Area Safe Box"
                    description="Restrict placement or tiling inside a draggable region"
                    checked={activeLayer.customArea.enabled}
                    onChange={(checked) => {
                      onUpdateLayer(activeLayer.id, {
                        customArea: { ...activeLayer.customArea, enabled: checked },
                      });
                      onCommitLastPlaced();
                    }}
                  />

                  {activeLayer.customArea.enabled && (
                    <div className="p-2.5 rounded-xl bg-[#090B0E] border border-blue-500/30 flex items-center justify-between text-[11px] font-mono text-blue-300">
                      <span>
                        X:{Math.round(activeLayer.customArea.x * 100)}% Y:
                        {Math.round(activeLayer.customArea.y * 100)}% W:
                        {Math.round(activeLayer.customArea.width * 100)}% H:
                        {Math.round(activeLayer.customArea.height * 100)}%
                      </span>
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
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. EFFECTS & LEGIBILITY */}
        {activeLayer && (
          <div className="p-4 space-y-3">
            <button
              type="button"
              onClick={() => toggleGroup('effects')}
              className="w-full flex items-center justify-between text-xs font-semibold text-white cursor-pointer"
            >
              <span>Backdrop Box, Shadow &amp; Blend</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  openGroups.effects ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openGroups.effects && (
              <div className="space-y-3 pt-1">
                {activeLayer.type === 'text' && (
                  <>
                    <StudioSlider
                      label="Letter Spacing"
                      min={-0.04}
                      max={0.45}
                      step={0.01}
                      defaultValue={0.03}
                      value={activeLayer.letterSpacing}
                      displayValue={`${Math.round(activeLayer.letterSpacing * 100)}%`}
                      onChange={(val) => onUpdateLayer(activeLayer.id, { letterSpacing: val })}
                      onCommit={onCommitLastPlaced}
                    />

                    <StudioSwitch
                      label="Backdrop Box"
                      checked={activeLayer.boxEnabled}
                      onChange={(checked) => {
                        onUpdateLayer(activeLayer.id, { boxEnabled: checked });
                        onCommitLastPlaced();
                      }}
                    />

                    {activeLayer.boxEnabled && (
                      <div className="p-3 rounded-xl bg-[#090B0E] border border-white/[0.08] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">Box Fill</span>
                          <input
                            type="color"
                            value={activeLayer.boxColor}
                            onChange={(e) =>
                              onUpdateLayer(activeLayer.id, { boxColor: e.target.value })
                            }
                            className="w-7 h-7 rounded-lg bg-transparent border border-white/20 cursor-pointer"
                          />
                        </div>
                        <StudioSlider
                          label="Box Opacity"
                          min={0.1}
                          max={1}
                          step={0.05}
                          defaultValue={0.65}
                          value={activeLayer.boxOpacity}
                          displayValue={`${Math.round(activeLayer.boxOpacity * 100)}%`}
                          onChange={(val) => onUpdateLayer(activeLayer.id, { boxOpacity: val })}
                        />
                      </div>
                    )}

                    <StudioSwitch
                      label="Drop Shadow"
                      checked={activeLayer.shadowEnabled}
                      onChange={(checked) => {
                        onUpdateLayer(activeLayer.id, { shadowEnabled: checked });
                        onCommitLastPlaced();
                      }}
                    />

                    <StudioSwitch
                      label="Text Outline"
                      checked={activeLayer.strokeEnabled}
                      onChange={(checked) => {
                        onUpdateLayer(activeLayer.id, { strokeEnabled: checked });
                        onCommitLastPlaced();
                      }}
                    />
                  </>
                )}

                <div>
                  <label className="text-xs text-slate-300 block mb-1.5">Blend Mode</label>
                  <select
                    value={activeLayer.blendMode}
                    onChange={(e) => {
                      onUpdateLayer(activeLayer.id, { blendMode: e.target.value as BlendMode });
                      onCommitLastPlaced();
                    }}
                    className="w-full px-3 py-2 text-xs bg-[#090B0E] border border-white/[0.1] rounded-xl text-white"
                  >
                    <option value="source-over">Normal</option>
                    <option value="multiply">Multiply (Darken)</option>
                    <option value="screen">Screen (Lighten)</option>
                    <option value="overlay">Overlay (Contrast)</option>
                    <option value="soft-light">Soft Light (Subtle)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
