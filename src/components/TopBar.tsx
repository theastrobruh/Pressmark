import { Download, Loader2 } from 'lucide-react';
import { WorkspaceTab } from '../types/studio';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  itemCount: number;
  isExporting: boolean;
  onQuickExport: () => void;
}

const NAV_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'watermark', label: 'Watermark' },
  { id: 'resize', label: 'Resize & Format' },
  { id: 'rename', label: 'Bulk Rename' },
  { id: 'export', label: 'Batch Export' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  itemCount,
  isExporting,
  onQuickExport,
}: TopBarProps) {
  return (
    <header className="h-14 shrink-0 border-b border-white/[0.08] bg-[#111318] px-5 flex items-center justify-between gap-8">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('watermark');
        }}
        className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
      >
        Pressmark
      </a>

      {/* Zone 2: Concise single-line navigation tabs */}
      <nav aria-label="Workspace tools" className="flex items-center gap-6 overflow-x-auto">
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Single primary action button */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          disabled={itemCount === 0 || isExporting}
          onClick={onQuickExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span className="tabular-nums">
            {isExporting
              ? 'Exporting...'
              : itemCount > 1
                ? `Export Batch (${itemCount})`
                : 'Export Media'}
          </span>
        </button>
      </div>
    </header>
  );
}
