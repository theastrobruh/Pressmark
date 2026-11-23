import { ArrowRight, RotateCcw } from 'lucide-react';
import { DEFAULT_RENAME_CONFIG } from '../constants/presets';
import {
  FormatConfig,
  MediaItem,
  RenameCaseTransform,
  RenameConfig,
  ResizeConfig,
} from '../types/studio';
import {
  buildOutputFilename,
  computeTargetDimensions,
  resolveOutputMimeAndExt,
} from '../utils/canvasRenderer';

interface BulkRenameWorkspaceProps {
  items: MediaItem[];
  rename: RenameConfig;
  resize: ResizeConfig;
  format: FormatConfig;
  activePresetName: string;
  onChangeRename: (patch: Partial<RenameConfig>) => void;
}

const PATTERN_TOKENS = [
  { token: '{name}', label: 'Original Name' },
  { token: '{n}', label: 'Sequence #' },
  { token: '{date}', label: 'Date' },
  { token: '{preset}', label: 'Preset' },
  { token: '{w}x{h}', label: 'Dimensions' },
];

export function BulkRenameWorkspace({
  items,
  rename,
  resize,
  format,
  activePresetName,
  onChangeRename,
}: BulkRenameWorkspaceProps) {
  const appendToken = (token: string) => {
    const next = rename.pattern ? `${rename.pattern}_${token}` : token;
    onChangeRename({ enabled: true, pattern: next });
  };

  return (
    <div className="flex-1 min-w-0 bg-[#0B0D10] flex flex-col lg:flex-row overflow-hidden">
      {/* Left Configuration Column */}
      <div className="w-full lg:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#12151B] p-5 overflow-y-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-display font-semibold text-white">
              Bulk Rename Rules
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Standardize filenames for SEO, client galleries, or social uploads.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-white cursor-pointer shrink-0 pt-1">
            <input
              type="checkbox"
              checked={rename.enabled}
              onChange={(e) => onChangeRename({ enabled: e.target.checked })}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
            <span>Enable</span>
          </label>
        </div>

        {/* Pattern Input + Token Buttons */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Filename Pattern</label>
            <button
              type="button"
              onClick={() => onChangeRename({ ...DEFAULT_RENAME_CONFIG, enabled: rename.enabled })}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
          <input
            type="text"
            value={rename.pattern}
            onChange={(e) => onChangeRename({ enabled: true, pattern: e.target.value })}
            placeholder="{name}_{n}"
            className="w-full px-3 py-2 text-xs font-mono bg-[#0B0D10] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PATTERN_TOKENS.map((item) => (
              <button
                key={item.token}
                type="button"
                onClick={() => appendToken(item.token)}
                className="px-2 py-1 text-[11px] font-mono rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-slate-200 transition-colors cursor-pointer"
              >
                +{item.token}
              </button>
            ))}
          </div>
        </div>

        {/* Prefix & Suffix */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.07]">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Prefix</label>
            <input
              type="text"
              value={rename.prefix}
              onChange={(e) => onChangeRename({ enabled: true, prefix: e.target.value })}
              placeholder="e.g. client_"
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#0B0D10] border border-white/[0.1] rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Suffix</label>
            <input
              type="text"
              value={rename.suffix}
              onChange={(e) => onChangeRename({ enabled: true, suffix: e.target.value })}
              placeholder="e.g. _web"
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#0B0D10] border border-white/[0.1] rounded-md text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Find & Replace */}
        <div className="space-y-2.5 pt-2 border-t border-white/[0.07]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Find &amp; Replace</span>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rename.caseInsensitive}
                onChange={(e) => onChangeRename({ caseInsensitive: e.target.checked })}
                className="accent-blue-600"
              />
              <span>Ignore Case</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              value={rename.find}
              onChange={(e) => onChangeRename({ enabled: true, find: e.target.value })}
              placeholder="Find text..."
              className="w-full px-2.5 py-1.5 text-xs bg-[#0B0D10] border border-white/[0.1] rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={rename.replace}
              onChange={(e) => onChangeRename({ enabled: true, replace: e.target.value })}
              placeholder="Replace with..."
              className="w-full px-2.5 py-1.5 text-xs bg-[#0B0D10] border border-white/[0.1] rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Case Transform & Numbering */}
        <div className="space-y-3 pt-2 border-t border-white/[0.07]">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Case &amp; Slug Style
            </label>
            <select
              value={rename.caseTransform}
              onChange={(e) =>
                onChangeRename({
                  enabled: true,
                  caseTransform: e.target.value as RenameCaseTransform,
                })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-[#0B0D10] border border-white/[0.1] rounded-md text-white focus:outline-none focus:border-blue-500"
            >
              <option value="none">Keep Original Case</option>
              <option value="kebab">web-kebab-case (Best for URLs)</option>
              <option value="snake">snake_case_slug</option>
              <option value="lower">lowercase</option>
              <option value="upper">UPPERCASE</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Start Index</label>
              <input
                type="number"
                min={0}
                value={rename.startIndex}
                onChange={(e) =>
                  onChangeRename({
                    enabled: true,
                    startIndex: Math.max(0, parseInt(e.target.value, 10) || 1),
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#0B0D10] border border-white/[0.1] rounded-md text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Zero Padding</label>
              <select
                value={rename.padLength}
                onChange={(e) =>
                  onChangeRename({
                    enabled: true,
                    padLength: parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#0B0D10] border border-white/[0.1] rounded-md text-white"
              >
                <option value={1}>1 digit (1, 2)</option>
                <option value={2}>2 digits (01, 02)</option>
                <option value={3}>3 digits (001, 002)</option>
                <option value={4}>4 digits (0001, 0002)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Table */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto pb-20 md:pb-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-display font-semibold text-white">
                Live Output Filename Preview
              </h3>
              <p className="text-xs text-slate-400">
                {rename.enabled
                  ? 'Active rename rules will be applied across all exported files.'
                  : 'Bulk rename is currently off — original filenames will be preserved.'}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 shrink-0">
              {items.length} {items.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-[#12151B] overflow-x-auto">
            <table className="w-full min-w-[540px] text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] font-medium text-slate-400 bg-[#0E1014]">
                  <th className="py-2.5 px-3 w-12 font-mono">#</th>
                  <th className="py-2.5 px-3">Original Filename</th>
                  <th className="py-2.5 px-2 w-8" aria-hidden="true" />
                  <th className="py-2.5 px-3">Export Filename</th>
                  <th className="py-2.5 px-3 text-right">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-xs">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      Add media files to preview batch renaming.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const dims = computeTargetDimensions(item.width, item.height, resize);
                    const outName = buildOutputFilename(
                      item,
                      idx,
                      rename,
                      format,
                      activePresetName,
                      dims
                    );
                    const { ext } = resolveOutputMimeAndExt(item, format);
                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400 truncate max-w-[220px]">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-2 text-slate-600">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-white font-medium truncate max-w-[260px]">
                          {outName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-right whitespace-nowrap">
                          {dims.width}×{dims.height} · {ext.toUpperCase()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
