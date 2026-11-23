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
    <>
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

      {/* MOBILE & TABLET PORTRAIT (< lg): Sleek Horizontal Filmstrip */}
      <div className="lg:hidden shrink-0 border-b border-white/[0.08] bg-[#12151B] px-3 py-2 flex items-center gap-2.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Add photos, GIFs, or videos"
          className="w-12 h-12 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/40 text-blue-300 flex flex-col items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span className="text-[10px] font-semibold mt-0.5">Add</span>
        </button>

        {lastPlaced && (
          <button
            type="button"
            onClick={onApplyLastPlaced}
            className="h-12 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-medium text-slate-200 whitespace-nowrap">
              Last Placed
            </span>
          </button>
        )}

        <div className="h-8 w-px bg-white/[0.08] shrink-0" aria-hidden="true" />

        {items.length === 0 ? (
          <button
            type="button"
            onClick={onRestoreSamples}
            className="h-11 px-3 rounded-lg bg-white/[0.04] text-xs text-blue-400 font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            Load sample photos
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            {items.map((item) => {
              const isSelected = item.id === activeId;
              return (
                <div
                  key={item.id}
                  className="relative shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => onSelectItem(item.id)}
                    aria-label={`Select ${item.name}`}
                    className={`w-12 h-12 rounded-xl overflow-hidden bg-[#0B0D10] block cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 scale-[1.03]'
                        : 'ring-1 ring-white/[0.1] opacity-75 hover:opacity-100'
                    }`}
                  >
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
                  </button>
                  {isSelected && (
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(item.id);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1C212A] border border-white/25 text-slate-200 flex items-center justify-center shadow cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DESKTOP (lg+): Full Left Media Queue Sidebar */}
      <aside className="hidden lg:flex w-[264px] shrink-0 border-r border-white/[0.08] bg-[#12151B] flex-col">
        {/* Upload Action Area */}
        <div className="p-4 border-b border-white/[0.07] space-y-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
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
                    {lastPlaced.layers.length} {lastPlaced.layers.length === 1 ? 'layer' : 'layers'}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-blue-300 shrink-0">Apply</span>
            </button>
          )}
        </div>

        {/* Batch Mode Switch */}
        <div className="px-4 py-2.5 border-b border-white/[0.07] flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">Apply edits to</span>
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
                Drop images, animated GIFs, or videos anywhere to begin.
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
                    {item.bgRemoval?.enabled && (
                      <div className="text-[10px] text-blue-400 font-medium mt-0.5">
                        BG Removed
                      </div>
                    )}
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
          <span className="truncate">100% private local processing</span>
        </div>
      </aside>
    </>
  );
}
