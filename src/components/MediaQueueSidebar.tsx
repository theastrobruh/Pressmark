import { Film, History, Image as ImageIcon, Plus, Trash2, Upload, X } from 'lucide-react';
import { useRef } from 'react';
import { MediaItem } from '../types/studio';
import { formatBytes } from '../utils/canvasRenderer';
import { LastPlacedState } from '../utils/storage';

interface MediaQueueSidebarProps {
  items: MediaItem[];
  activeId: string | null;
  syncAllWatermarks: boolean;
  onToggleSyncAll: (sync: boolean) => void;
  onSelectItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onUploadFiles: (files: FileList | File[]) => void;
  lastPlaced: LastPlacedState | null;
  onApplyLastPlaced: () => void;
  onRestoreSamples: () => void;
}

export function MediaQueueSidebar({
  items,
  activeId,
  syncAllWatermarks,
  onToggleSyncAll,
  onSelectItem,
  onRemoveItem,
  onClearAll,
  onUploadFiles,
  lastPlaced,
  onApplyLastPlaced,
  onRestoreSamples,
}: MediaQueueSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="w-full lg:w-[272px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#12151B] flex flex-col max-h-[260px] lg:max-h-none">
      {/* Upload Action Area */}
      <div className="p-4 border-b border-white/[0.07] space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/mp4,video/webm,video/quicktime,.gif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUploadFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.1] text-sm font-medium text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <Upload className="w-4 h-4 text-blue-400" />
          <span>Add Photos, GIFs, Videos</span>
        </button>

        {lastPlaced && (
          <button
            type="button"
            onClick={onApplyLastPlaced}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <History className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-blue-100 truncate">
                  Apply Last Placed
                </div>
                <div className="text-[11px] text-blue-300/80 font-mono truncate">
                  {lastPlaced.layers.length} {lastPlaced.layers.length === 1 ? 'layer' : 'layers'} saved
                </div>
              </div>
            </div>
            <span className="text-[11px] font-medium text-blue-300 shrink-0">Apply</span>
          </button>
        )}
      </div>

      {/* Batch Mode Switch */}
      <div className="px-4 py-2.5 border-b border-white/[0.07] flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-400">Batch sync</span>
        <div className="flex items-center gap-1 p-0.5 bg-[#0B0D10] rounded-md border border-white/[0.07]">
          <button
            type="button"
            onClick={() => onToggleSyncAll(true)}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
              syncAllWatermarks ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Files
          </button>
          <button
            type="button"
            onClick={() => onToggleSyncAll(false)}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
              !syncAllWatermarks ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Per File
          </button>
        </div>
      </div>

      {/* Queue Header */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-400">
        <span className="font-medium text-slate-300 tabular-nums">
          Queue ({items.length})
        </span>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Media List */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-1">
        {items.length === 0 ? (
          <div className="px-3 py-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drop images, animated GIFs, or videos here to start watermarking.
            </p>
            <button
              type="button"
              onClick={onRestoreSamples}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Load sample photos</span>
            </button>
          </div>
        ) : (
          items.map((item) => {
            const isSelected = item.id === activeId;
            const kindLabel =
              item.kind === 'video' ? 'VID' : item.kind === 'gif' ? 'GIF' : 'IMG';

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectItem(item.id);
                  }
                }}
                className={`group flex items-center gap-2.5 p-2 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/40'
                    : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]'
                }`}
              >
                <div className="w-11 h-11 rounded-md overflow-hidden bg-[#0B0D10] border border-white/[0.08] shrink-0 flex items-center justify-center">
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

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-medium truncate ${
                        isSelected ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono truncate">
                    <span className="text-slate-300">{kindLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {item.width}×{item.height}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatBytes(item.sizeBytes)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] transition-opacity cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer note */}
      <div className="px-4 py-2.5 border-t border-white/[0.07] text-[11px] text-slate-500 flex items-center gap-1.5">
        <Film className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Processed locally in your browser</span>
      </div>
    </aside>
  );
}
