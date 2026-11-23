import { Archive, ArrowRight, Eraser, Maximize2, Stamp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { SAMPLE_MEDIA } from '../constants/presets';

const SKIP_WELCOME_KEY = 'pressmark_skip_welcome_v1';

interface StudioIntroGateProps {
  onReady?: () => void;
}

type IntroPhase = 'loading' | 'welcome' | 'done';

const CAPABILITIES = [
  {
    icon: Stamp,
    title: 'Smart Watermarking',
    detail:
      'Add text handles, custom logos, studio stamps, or diagonal tiled proofs to images, GIFs, and videos with saved presets and 1-click Last Placed recall.',
  },
  {
    icon: Eraser,
    title: 'Precision Cutout Tool',
    detail:
      'Remove backgrounds locally with edge flood-fill, chroma/luma keys, edge choke & feathering, color despill, and erase/restore brushes.',
  },
  {
    icon: Maximize2,
    title: 'Resize & Web Formats',
    detail:
      'Snap to Instagram, TikTok, X, or OpenGraph dimensions and convert batches between PNG, JPEG, and WebP with live file-size previews.',
  },
  {
    icon: Archive,
    title: 'Bulk Rename & ZIP Pack',
    detail:
      'Rename entire queues with dynamic tokens ({name}, {n}, {dim}) and export individual files or a single ready-to-post ZIP archive.',
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().catch(() => undefined).finally(resolve);
      } else {
        resolve();
      }
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

export function StudioIntroGate({ onReady }: StudioIntroGateProps) {
  const [phase, setPhase] = useState<IntroPhase>('loading');
  const [progress, setProgress] = useState(12);
  const [statusLabel, setStatusLabel] = useState('Initializing workspace...');
  const [skipNextTime, setSkipNextTime] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SKIP_WELCOME_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;

    async function loadStudioResources() {
      const startedAt = performance.now();

      setStatusLabel('Loading studio typography...');
      setProgress(28);
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await Promise.race([document.fonts.ready, sleep(1400)]);
      }
      if (cancelled) return;

      setStatusLabel('Preloading sample media & canvas buffers...');
      setProgress(52);
      const totalSamples = SAMPLE_MEDIA.length || 1;
      let loadedCount = 0;

      await Promise.all(
        SAMPLE_MEDIA.map((item) =>
          preloadImage(item.url).then(() => {
            if (cancelled) return;
            loadedCount += 1;
            const pct = 52 + Math.round((loadedCount / totalSamples) * 38);
            setProgress(pct);
          })
        )
      );
      if (cancelled) return;

      setStatusLabel('Restoring presets & tools...');
      setProgress(100);

      // Ensure a clean, calm minimum intro cadence without artificial long waits
      const elapsed = performance.now() - startedAt;
      if (elapsed < 720) {
        await sleep(720 - elapsed);
      }
      if (cancelled) return;

      let shouldSkip = false;
      try {
        shouldSkip = localStorage.getItem(SKIP_WELCOME_KEY) === 'true';
      } catch {
        shouldSkip = false;
      }

      if (shouldSkip) {
        setPhase('done');
        onReady?.();
      } else {
        setPhase('welcome');
      }
    }

    loadStudioResources();

    return () => {
      cancelled = true;
    };
  }, [onReady]);

  const handleEnterStudio = () => {
    try {
      if (skipNextTime) {
        localStorage.setItem(SKIP_WELCOME_KEY, 'true');
      } else {
        localStorage.removeItem(SKIP_WELCOME_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
    setPhase('done');
    onReady?.();
  };

  useEffect(() => {
    if (phase !== 'welcome') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleEnterStudio();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="studio-intro-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0D0F14]/95 backdrop-blur-md p-4 overflow-y-auto"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 38%, rgba(59,130,246,0.11), transparent 58%)',
          }}
        >
          <AnimatePresence mode="wait">
            {phase === 'loading' ? (
              <motion.div
                key="intro-loading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-xs flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#161B24] border border-white/[0.1] flex items-center justify-center mb-4 shadow-lg">
                  <Stamp className="w-5 h-5 text-blue-400" />
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold tracking-tight text-white">
                    Pressmark
                  </span>
                  <span className="font-mono text-xs font-medium text-blue-400">
                    BETA v.0.5.0
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">by: theAstroBruh</p>

                <div className="w-full mt-7">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                    <span className="truncate pr-2">{statusLabel}</span>
                    <span className="font-mono tabular-nums text-slate-300 shrink-0">
                      {progress}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-[width] duration-200 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.section
                key="intro-welcome"
                aria-labelledby="welcome-heading"
                initial={{ opacity: 0, scale: 0.97, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[580px] rounded-2xl bg-[#13161E] border border-white/[0.11] shadow-[0_32px_90px_rgba(0,0,0,0.75)] overflow-hidden my-auto"
              >
                {/* Header */}
                <div className="px-5 sm:px-7 pt-6 pb-5 border-b border-white/[0.07]">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-base font-bold tracking-tight text-white">
                      Pressmark
                    </span>
                    <span className="font-mono text-[11px] font-medium text-blue-400">
                      BETA v.0.5.0
                    </span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-xs text-slate-400">by: theAstroBruh</span>
                  </div>

                  <h1
                    id="welcome-heading"
                    className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white mt-3 text-balance"
                  >
                    Prep images, GIFs, and videos before posting.
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                    Everything runs locally in your browser with zero uploads. Here is what you can
                    do inside the studio:
                  </p>
                </div>

                {/* Capabilities Grid */}
                <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CAPABILITIES.map(({ icon: Icon, title, detail }) => (
                    <div
                      key={title}
                      className="rounded-xl bg-[#0E1117] border border-white/[0.07] p-3.5 flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xs sm:text-[13px] font-semibold text-white">
                          {title}
                        </h2>
                        <p className="text-[11.5px] text-slate-400 leading-relaxed mt-1">
                          {detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Action */}
                <div className="px-5 sm:px-7 py-4 bg-[#0E1015] border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2.5 text-xs text-slate-400 hover:text-slate-300 cursor-pointer select-none min-h-[36px]">
                    <input
                      type="checkbox"
                      checked={skipNextTime}
                      onChange={(e) => setSkipNextTime(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-[#161A22] accent-blue-600 cursor-pointer"
                    />
                    <span>Skip welcome screen next time</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleEnterStudio}
                    autoFocus
                    className="min-h-[44px] px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 shrink-0"
                  >
                    <span>Start Creating</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
