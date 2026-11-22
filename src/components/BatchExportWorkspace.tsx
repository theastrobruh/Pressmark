import { Archive, CheckCircle2, Download, Loader2 } from 'lucide-react';
import {
  ExportProgress,
  FormatConfig,
  MediaItem,
  RenameConfig,
  ResizeConfig,
  WatermarkLayer,
} from '../types/studio';
import {
  buildOutputFilename,
  computeTargetDimensions,
  formatBytes,
  resolveOutputMimeAndExt,
} from '../utils/canvasRenderer';

interface BatchExportWorkspaceProps {
  items: MediaItem[];
  getLayersForItem: (item: MediaItem) => WatermarkLayer[];
  resize: ResizeConfig;
  format: FormatConfig;
  rename: RenameConfig;
  activePresetName: string;
  progress: ExportProgress;
  exportingSingleId: string | null;
  onExportZip: () => void;
  onExportAllIndividual: () => void;
  onExportSingle: (item: MediaItem) => void;
}

export function BatchExportWorkspace({
  items,
  getLayersForItem,
  resize,
  format,
  rename,
  activePresetName,
  progress,
  exportingSingleId,
  onExportZip,
  onExportAllIndividual,
  onExportSingle,
}: BatchExportWorkspaceProps) {
  const sampleLayers = items[0] ? getLayersForItem(items[0]) : [];
  const visibleLayersCount = sampleLayers.filter((l) => l.visible).length;

  return (
    <div className="flex-1 min-w-0 bg-[#0B0D10] p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header + Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div>
            <h2 className="text-xl font-display font-semibold text-white">
              Batch Export Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Every photo, animated GIF, and video is rendered locally at full quality with your watermarks, resize settings, and rename rules.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={items.length === 0 || progress.active}
              onClick={onExportAllIndividual}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Files Separately</span>
            </button>
            <button
              type="button"
              disabled={items.length === 0 || progress.active}
              onClick={onExportZip}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
            >
              {progress.active ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>Export All as ZIP ({items.length})</span>
            </button>
          </div>
        </div>

        {/* Active Export Progress Bar */}
        {progress.active && (
          <div className="p-4 rounded-lg bg-[#12151B] border border-blue-500/35 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-white truncate">
                {progress.currentFileName}
              </span>
              <span className="font-mono text-blue-300 shrink-0 ml-4">
                {progress.currentIndex} / {progress.total}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0A0C0F] overflow-hidden">
              <div
                style={{
                  width: `${Math.max(
                    6,
                    Math.round((progress.currentIndex / Math.max(1, progress.total)) * 100)
                  )}%`,
                }}
                className="h-full bg-blue-500 transition-all duration-200"
              />
            </div>
            <p className="text-[11px] text-slate-400">{progress.stageLabel}</p>
          </div>
        )}

        {/* Pipeline Summary Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-b border-white/[0.07]">
          <div>
            <div className="text-[11px] text-slate-400">Queued Assets</div>
            <div className="text-lg font-display font-semibold text-white font-mono mt-0.5">
              {items.length}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Watermark Layers</div>
            <div className="text-lg font-display font-semibold text-white font-mono mt-0.5">
              {visibleLayersCount} active
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Resize Rule</div>
            <div className="text-sm font-medium text-white mt-1 truncate">
              {!resize.enabled || resize.presetId === 'original'
                ? 'Original dimensions'
                : `${resize.width}×${resize.height} (${resize.fitMode})`}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Image Format</div>
            <div className="text-sm font-medium text-white mt-1 truncate">
              {format.outputFormat === 'original'
                ? 'Keep source format'
                : `${format.outputFormat.replace('image/', '').toUpperCase()} · ${Math.round(
                    format.quality * 100
                  )}%`}
            </div>
          </div>
        </div>

        {/* Queue Export Table */}
        <div className="rounded-lg border border-white/[0.08] bg-[#12151B] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] font-medium text-slate-400 bg-[#0E1014]">
                <th className="py-2.5 px-4">Asset</th>
                <th className="py-2.5 px-3">Output Filename</th>
                <th className="py-2.5 px-3">Dimensions</th>
                <th className="py-2.5 px-3">Format</th>
                <th className="py-2.5 px-3">Source Size</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-xs">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No media files in queue. Add photos, GIFs, or videos to export.
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
                  const isBusy = exportingSingleId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded bg-[#0A0C0F] border border-white/[0.08] overflow-hidden shrink-0">
                            {item.kind === 'video' ? (
                              <video
                                src={item.url}
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={item.url}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <span className="text-slate-300 truncate max-w-[140px]">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white truncate max-w-[220px]">
                        {outName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                        {dims.width}×{dims.height}
                      </td>
                      <td className="py-2.5 px-3 font-mono uppercase text-slate-300">
                        {ext}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">
                        {formatBytes(item.sizeBytes)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={isBusy || progress.active}
                          onClick={() => onExportSingle(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded bg-white/[0.06] hover:bg-white/[0.12] text-white disabled:opacity-40 cursor-pointer whitespace-nowrap"
                        >
                          {isBusy ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-blue-400" />
                          )}
                          <span>{isBusy ? 'Rendering...' : 'Download'}</span>
                        </button>
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
  );
}
