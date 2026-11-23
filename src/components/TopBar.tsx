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
  { id: 'remove-bg', label: 'Remove BG' },
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
    <header className="h-[54px] md:h-14 shrink-0 border-b border-white/[0.08] bg-[#111318] px-3 sm:px-5 flex items-center justify-between gap-2 md:gap-4 lg:gap-6">
      {/* Zone 1: Brand Lockup + Symmetrically Aligned Creator Links */}
      <div className="flex items-center flex-1 md:flex-initial min-w-0">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('watermark');
          }}
          className="flex flex-col justify-center leading-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
        >
          <div className="flex items-baseline gap-1.5 sm:gap-2 whitespace-nowrap">
            <span className="font-display text-[15px] sm:text-lg font-bold tracking-tight text-white">
              Pressmark
            </span>
            <span className="font-mono text-[9.5px] sm:text-[11px] font-medium text-blue-400">
              BETA v.0.5.0
            </span>
          </div>
          <span className="text-[9.5px] sm:text-[10px] text-slate-400 tracking-wide mt-0.5 whitespace-nowrap">
            by: theAstroBruh
          </span>
        </a>

        {/* Symmetric space between Brand Logo and Main Navigation (Desktop) / Export CTA (Mobile) */}
        <div className="flex-1 flex items-center justify-center px-2 sm:px-4 md:px-4 lg:px-7">
          <div
            aria-label="Creator links"
            className="inline-flex items-center gap-0.5 sm:gap-1 px-1 py-0.5 rounded-xl bg-white/[0.025] border border-white/[0.06]"
          >
            {/* 1. theAstroBruh GitHub */}
            <a
              href="https://github.com/theastrobruh"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="theAstroBruh GitHub"
              title="theAstroBruh on GitHub"
              className="w-8 h-8 md:w-8 md:h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.07] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-[15px] h-[15px]"
                aria-hidden="true"
              >
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
            </a>

            {/* 2. the.astro.os - Web OS created by theAstroBruh */}
            <a
              href="https://theastrobruh.github.io/the.astro.os/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="the.astro.os — Web OS created by theAstroBruh"
              title="the.astro.os — Web OS by theAstroBruh"
              className="w-8 h-8 md:w-8 md:h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[15px] h-[15px]"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="15" rx="2.5" />
                <path d="M3 8.5h18" />
                <circle cx="6.25" cy="6.25" r="0.6" fill="currentColor" stroke="none" />
                <circle cx="8.75" cy="6.25" r="0.6" fill="currentColor" stroke="none" />
                <path d="M12 11.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9z" fill="currentColor" stroke="none" />
              </svg>
            </a>

            {/* 3. Ko-Fi Animated Heart / Coffee Cup */}
            <a
              href="https://ko-fi.com/theastrobruh"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Support theAstroBruh on Ko-fi"
              title="Support on Ko-fi"
              className="group w-8 h-8 md:w-8 md:h-8 inline-flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-[#FF5E5B]/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5E5B]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-[16px] h-[16px]"
                aria-hidden="true"
              >
                {/* Coffee Cup */}
                <path
                  d="M4.5 8.5h11.5v5.25a4.75 4.75 0 0 1-4.75 4.75H9.25A4.75 4.75 0 0 1 4.5 13.75V8.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                {/* Cup Handle */}
                <path
                  d="M16 9.5h1.75a2.25 2.25 0 0 1 0 4.5H16"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                {/* Animated Ko-fi Heart */}
                <path
                  d="M10.25 15.1s-2.55-1.55-2.55-3.15a1.42 1.42 0 0 1 2.55-.86 1.42 1.42 0 0 1 2.55.86c0 1.6-2.55 3.15-2.55 3.15Z"
                  fill="#FF5E5B"
                  className="animate-kofi-heart"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Zone 2: Desktop / Tablet Single-Line Navigation */}
      <nav
        aria-label="Workspace tools"
        className="hidden md:flex items-center justify-center gap-3 lg:gap-6 overflow-x-auto"
      >
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative py-4 text-[12px] lg:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ${
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

      {/* Zone 3: Single Primary Action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          disabled={itemCount === 0 || isExporting}
          onClick={onQuickExport}
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 min-h-[38px] sm:min-h-[36px] text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
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
                ? `Export (${itemCount})`
                : 'Export'}
          </span>
        </button>
      </div>
    </header>
  );
}
