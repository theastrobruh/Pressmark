import {
  Archive,
  ChevronUp,
  Eraser,
  FileEdit,
  Maximize2,
  SlidersHorizontal,
  Stamp,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BatchExportWorkspace } from './components/BatchExportWorkspace';
import { BulkRenameWorkspace } from './components/BulkRenameWorkspace';
import { InteractiveStage } from './components/InteractiveStage';
import { MediaQueueSidebar } from './components/MediaQueueSidebar';
import { BgStageTool, RemoveBgPanel } from './components/RemoveBgPanel';
import { ResizeFormatPanel } from './components/ResizeFormatPanel';
import { StudioIntroGate } from './components/StudioIntroGate';
import { TopBar } from './components/TopBar';
import { WatermarkInspector } from './components/WatermarkInspector';
import {
  BUILTIN_PRESETS,
  createDefaultBadgeLayer,
  createDefaultTextLayer,
  DEFAULT_BG_REMOVAL,
  DEFAULT_FORMAT_CONFIG,
  DEFAULT_RENAME_CONFIG,
  DEFAULT_RESIZE_CONFIG,
  SAMPLE_MEDIA,
} from './constants/presets';
import {
  BgBrushStroke,
  BgRemovalConfig,
  ExportProgress,
  FormatConfig,
  MediaItem,
  MediaKind,
  RenameConfig,
  ResizeConfig,
  WatermarkLayer,
  WatermarkPreset,
  WorkspaceTab,
} from './types/studio';
import { sampleBorderColor } from './utils/bgRemover';
import {
  buildOutputFilename,
  computeTargetDimensions,
  loadImageAsync,
} from './utils/canvasRenderer';
import {
  exportBatchAsZip,
  exportMediaItem,
  triggerBlobDownload,
} from './utils/mediaExporter';
import {
  cloneLayers,
  LastPlacedState,
  loadLastPlaced,
  loadUserPresets,
  saveLastPlaced,
  saveUserPresets,
} from './utils/storage';

async function inspectUploadedFile(file: File): Promise<MediaItem | null> {
  const url = URL.createObjectURL(file);
  const lower = file.name.toLowerCase();
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(lower);
  const isGif = file.type === 'image/gif' || lower.endsWith('.gif');
  const kind: MediaKind = isVideo ? 'video' : isGif ? 'gif' : 'image';

  try {
    if (isVideo) {
      const dims = await new Promise<{ w: number; h: number; dur: number }>((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve({
            w: video.videoWidth || 1280,
            h: video.videoHeight || 720,
            dur: video.duration || 0,
          });
        };
        video.onerror = () => reject(new Error('Invalid video'));
        video.src = url;
      });
      return {
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        url,
        file,
        kind,
        width: dims.w,
        height: dims.h,
        sizeBytes: file.size,
        mimeType: file.type || 'video/mp4',
        durationSec: dims.dur,
      };
    } else {
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          resolve({
            w: img.naturalWidth || 1000,
            h: img.naturalHeight || 1000,
          });
        img.onerror = () => reject(new Error('Invalid image'));
        img.src = url;
      });
      return {
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        url,
        file,
        kind,
        width: dims.w,
        height: dims.h,
        sizeBytes: file.size,
        mimeType: file.type || (isGif ? 'image/gif' : 'image/jpeg'),
      };
    }
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('watermark');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const [items, setItems] = useState<MediaItem[]>(SAMPLE_MEDIA);
  const [activeId, setActiveId] = useState<string | null>(SAMPLE_MEDIA[0]?.id || null);

  const [syncAllWatermarks, setSyncAllWatermarks] = useState(true);
  const [sharedLayers, setSharedLayers] = useState<WatermarkLayer[]>(() =>
    cloneLayers(BUILTIN_PRESETS[0].layers)
  );
  const [perItemLayers, setPerItemLayers] = useState<Record<string, WatermarkLayer[]>>({});
  const [activeLayerId, setActiveLayerId] = useState<string | null>(
    BUILTIN_PRESETS[0].layers[0]?.id || null
  );

  // Undo / Redo Stack for Watermark Layers
  const [historyPast, setHistoryPast] = useState<WatermarkLayer[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<WatermarkLayer[][]>([]);

  const [resize, setResize] = useState<ResizeConfig>(DEFAULT_RESIZE_CONFIG);
  const [format, setFormat] = useState<FormatConfig>(DEFAULT_FORMAT_CONFIG);
  const [rename, setRename] = useState<RenameConfig>(DEFAULT_RENAME_CONFIG);

  const [bgStageTool, setBgStageTool] = useState<BgStageTool>('pan');
  const [bgBrushRadius, setBgBrushRadius] = useState(0.045);

  const [presets, setPresets] = useState<WatermarkPreset[]>(() => loadUserPresets());
  const [activePresetId, setActivePresetId] = useState<string | null>(BUILTIN_PRESETS[0].id);
  const [lastPlaced, setLastPlaced] = useState<LastPlacedState | null>(() => loadLastPlaced());

  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    active: false,
    currentIndex: 0,
    total: 0,
    currentFileName: '',
    stageLabel: '',
  });
  const [exportingSingleId, setExportingSingleId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSelectTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    if (tab !== 'remove-bg') {
      setBgStageTool('pan');
    }
    if (tab === 'rename' || tab === 'export') {
      setMobileSheetOpen(false);
    }
  };

  const activeItem = useMemo(
    () => items.find((i) => i.id === activeId) || items[0] || null,
    [items, activeId]
  );

  const activeBgConfig: BgRemovalConfig = useMemo(
    () => activeItem?.bgRemoval || DEFAULT_BG_REMOVAL,
    [activeItem]
  );

  const handleChangeBgConfig = useCallback(
    (patch: Partial<BgRemovalConfig>) => {
      if (!activeItem) return;
      setItems((prev) =>
        prev.map((it) =>
          it.id === activeItem.id
            ? {
                ...it,
                bgRemoval: { ...(it.bgRemoval || DEFAULT_BG_REMOVAL), ...patch },
              }
            : it
        )
      );
    },
    [activeItem]
  );

  const handleAutoSampleBorder = useCallback(async () => {
    if (!activeItem || activeItem.kind === 'video') return;
    try {
      const img = await loadImageAsync(activeItem.url);
      const sampledHex = sampleBorderColor(
        img,
        img.naturalWidth || activeItem.width,
        img.naturalHeight || activeItem.height
      );
      handleChangeBgConfig({ enabled: true, targetColor: sampledHex });
      showToast(`Sampled border color ${sampledHex}`);
    } catch {
      showToast('Could not sample border color');
    }
  }, [activeItem, handleChangeBgConfig, showToast]);

  const handleApplyBgToAll = useCallback(() => {
    if (!activeItem) return;
    const cfg = activeItem.bgRemoval || DEFAULT_BG_REMOVAL;
    setItems((prev) =>
      prev.map((it) =>
        it.kind !== 'video' ? { ...it, bgRemoval: { ...cfg, strokes: [] } } : it
      )
    );
    showToast('Applied background removal to all images');
  }, [activeItem, showToast]);

  const handleAddBgStroke = useCallback(
    (stroke: BgBrushStroke) => {
      if (!activeItem) return;
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== activeItem.id) return it;
          const current = it.bgRemoval || DEFAULT_BG_REMOVAL;
          return {
            ...it,
            bgRemoval: {
              ...current,
              enabled: true,
              strokes: [...current.strokes, stroke],
            },
          };
        })
      );
    },
    [activeItem]
  );

  const getLayersForItem = useCallback(
    (item: MediaItem): WatermarkLayer[] => {
      if (syncAllWatermarks) return sharedLayers;
      return perItemLayers[item.id] || sharedLayers;
    },
    [syncAllWatermarks, sharedLayers, perItemLayers]
  );

  const currentLayers = useMemo(() => {
    if (!activeItem) return sharedLayers;
    return getLayersForItem(activeItem);
  }, [activeItem, getLayersForItem, sharedLayers]);

  const activeLayer = useMemo(
    () => currentLayers.find((l) => l.id === activeLayerId) || currentLayers[0] || null,
    [currentLayers, activeLayerId]
  );

  const setCurrentLayers = useCallback(
    (updater: (prev: WatermarkLayer[]) => WatermarkLayer[], recordHistory = false) => {
      if (recordHistory) {
        setHistoryPast((p) => [...p.slice(-24), cloneLayers(currentLayers)]);
        setHistoryFuture([]);
      }
      if (syncAllWatermarks || !activeItem) {
        setSharedLayers((prev) => updater(prev));
      } else {
        setPerItemLayers((prev) => {
          const base = prev[activeItem.id] || cloneLayers(sharedLayers);
          return { ...prev, [activeItem.id]: updater(base) };
        });
      }
    },
    [syncAllWatermarks, activeItem, sharedLayers, currentLayers]
  );

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((p) => p.slice(0, -1));
    setHistoryFuture((f) => [cloneLayers(currentLayers), ...f]);
    if (syncAllWatermarks || !activeItem) {
      setSharedLayers(previous);
    } else {
      setPerItemLayers((prev) => ({ ...prev, [activeItem.id]: previous }));
    }
    setActiveLayerId(previous[0]?.id || null);
  }, [historyPast, currentLayers, syncAllWatermarks, activeItem]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((f) => f.slice(1));
    setHistoryPast((p) => [...p, cloneLayers(currentLayers)]);
    if (syncAllWatermarks || !activeItem) {
      setSharedLayers(next);
    } else {
      setPerItemLayers((prev) => ({ ...prev, [activeItem.id]: next }));
    }
    setActiveLayerId(next[0]?.id || null);
  }, [historyFuture, currentLayers, syncAllWatermarks, activeItem]);

  // Keyboard shortcuts Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  const commitLastPlaced = useCallback(
    (overrideLayers?: WatermarkLayer[]) => {
      const targetLayers = overrideLayers || currentLayers;
      if (targetLayers.length === 0) return;
      const next: LastPlacedState = {
        layers: cloneLayers(targetLayers),
        resize,
        format,
        savedAt: Date.now(),
      };
      saveLastPlaced(next);
      setLastPlaced(next);
    },
    [currentLayers, resize, format]
  );

  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const parsed = (await Promise.all(files.map(inspectUploadedFile))).filter(
        (m): m is MediaItem => m !== null
      );
      if (parsed.length === 0) {
        showToast('No supported image, GIF, or video files found.');
        return;
      }

      setItems((prev) => {
        const hasOnlySamples = prev.every((i) => i.isSample);
        return hasOnlySamples ? parsed : [...prev, ...parsed];
      });
      setActiveId(parsed[0].id);
      showToast(`Added ${parsed.length} ${parsed.length === 1 ? 'file' : 'files'} to queue`);
    },
    [showToast]
  );

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target && !target.isSample) URL.revokeObjectURL(target.url);
      const next = prev.filter((p) => p.id !== id);
      if (activeId === id) {
        setActiveId(next[0]?.id || null);
      }
      return next;
    });
  };

  const handleClearAll = () => {
    items.forEach((item) => {
      if (!item.isSample) URL.revokeObjectURL(item.url);
    });
    setItems([]);
    setActiveId(null);
  };

  const handleAddLayer = (type: 'text' | 'image' | 'badge') => {
    let created: WatermarkLayer;
    if (type === 'image') {
      created = createDefaultTextLayer({
        name: 'Logo Watermark',
        type: 'image',
        x: 0.16,
        y: 0.14,
        scale: 0.18,
        opacity: 0.9,
      });
    } else if (type === 'badge') {
      created = createDefaultBadgeLayer();
    } else {
      created = createDefaultTextLayer({
        name: `Text Layer ${currentLayers.length + 1}`,
        x: 0.5,
        y: 0.5,
      });
    }
    setCurrentLayers((prev) => {
      const next = [...prev, created];
      commitLastPlaced(next);
      return next;
    }, true);
    setActiveLayerId(created.id);
    setActivePresetId(null);
  };

  const handleDuplicateLayer = (id: string) => {
    const src = currentLayers.find((l) => l.id === id);
    if (!src) return;
    const copy: WatermarkLayer = {
      ...JSON.parse(JSON.stringify(src)),
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${src.name} Copy`,
      x: Math.min(0.95, src.x + 0.04),
      y: Math.min(0.95, src.y + 0.04),
    };
    setCurrentLayers((prev) => {
      const next = [...prev, copy];
      commitLastPlaced(next);
      return next;
    }, true);
    setActiveLayerId(copy.id);
  };

  const handleRemoveLayer = (id: string) => {
    if (currentLayers.length <= 1) return;
    setCurrentLayers((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (activeLayerId === id) {
        setActiveLayerId(next[0]?.id || null);
      }
      commitLastPlaced(next);
      return next;
    }, true);
  };

  const handleUpdateLayer = (id: string, patch: Partial<WatermarkLayer>) => {
    setActivePresetId(null);
    setCurrentLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const handleApplyPreset = (preset: WatermarkPreset) => {
    const cloned = cloneLayers(preset.layers);
    setCurrentLayers(() => cloned, true);
    setActiveLayerId(cloned[0]?.id || null);
    setActivePresetId(preset.id);
    if (preset.resize) setResize(preset.resize);
    if (preset.format) setFormat(preset.format);
    commitLastPlaced(cloned);
    showToast(`Applied "${preset.name}"`);
  };

  const handleSavePreset = (name: string, includeResizeFormat: boolean) => {
    const newPreset: WatermarkPreset = {
      id: `preset-user-${Date.now()}`,
      name,
      description: `${currentLayers.length} ${
        currentLayers.length === 1 ? 'layer' : 'layers'
      } · saved custom placement`,
      updatedAt: Date.now(),
      layers: cloneLayers(currentLayers),
      resize: includeResizeFormat ? { ...resize } : undefined,
      format: includeResizeFormat ? { ...format } : undefined,
    };
    const next = [newPreset, ...presets];
    setPresets(next);
    saveUserPresets(next);
    setActivePresetId(newPreset.id);
    showToast(`Saved preset "${name}"`);
  };

  const handleDeletePreset = (id: string) => {
    const next = presets.filter((p) => p.id !== id);
    setPresets(next);
    saveUserPresets(next);
    if (activePresetId === id) setActivePresetId(null);
  };

  const handleImportPresets = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText) as WatermarkPreset[];
      if (!Array.isArray(parsed)) throw new Error('Invalid JSON');
      const imported = parsed
        .filter((p) => p && p.name && Array.isArray(p.layers))
        .map((p) => ({
          ...p,
          id: `preset-imp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          isBuiltIn: false,
        }));
      if (imported.length === 0) throw new Error('No presets found');
      const next = [...imported, ...presets];
      setPresets(next);
      saveUserPresets(next);
      showToast(`Imported ${imported.length} presets`);
    } catch {
      showToast('Could not import presets — invalid JSON format.');
    }
  };

  const handleApplyLastPlaced = () => {
    if (!lastPlaced) return;
    const cloned = cloneLayers(lastPlaced.layers);
    setCurrentLayers(() => cloned, true);
    setActiveLayerId(cloned[0]?.id || null);
    if (lastPlaced.resize) setResize(lastPlaced.resize);
    if (lastPlaced.format) setFormat(lastPlaced.format);
    showToast('Restored last placed watermark');
  };

  const activePresetName = useMemo(
    () => presets.find((p) => p.id === activePresetId)?.name || 'custom',
    [presets, activePresetId]
  );

  const handleExportSingle = async (item: MediaItem) => {
    if (exportingSingleId || exportProgress.active) return;
    setExportingSingleId(item.id);
    commitLastPlaced();
    try {
      const idx = Math.max(
        0,
        items.findIndex((i) => i.id === item.id)
      );
      const dims = computeTargetDimensions(item.width, item.height, resize);
      const filename = buildOutputFilename(
        item,
        idx,
        rename,
        format,
        activePresetName,
        dims
      );
      const blob = await exportMediaItem(
        item,
        getLayersForItem(item),
        resize,
        format
      );
      triggerBlobDownload(blob, filename);
      showToast(`Exported ${filename}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportingSingleId(null);
    }
  };

  const handleExportZip = async () => {
    if (items.length === 0 || exportProgress.active) return;
    commitLastPlaced();
    setExportProgress({
      active: true,
      currentIndex: 0,
      total: items.length,
      currentFileName: items[0].name,
      stageLabel: 'Preparing batch...',
    });

    try {
      await exportBatchAsZip(
        items,
        getLayersForItem,
        resize,
        format,
        rename,
        activePresetName,
        (index, total, filename, detail) => {
          setExportProgress({
            active: true,
            currentIndex: index,
            total,
            currentFileName: filename,
            stageLabel: detail,
          });
        }
      );
      showToast(`Exported ${items.length} files as ZIP`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Batch ZIP export failed');
    } finally {
      setExportProgress({
        active: false,
        currentIndex: 0,
        total: 0,
        currentFileName: '',
        stageLabel: '',
      });
    }
  };

  const handleExportAllIndividual = async () => {
    if (items.length === 0 || exportProgress.active) return;
    commitLastPlaced();
    setExportProgress({
      active: true,
      currentIndex: 0,
      total: items.length,
      currentFileName: items[0].name,
      stageLabel: 'Rendering files...',
    });
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const dims = computeTargetDimensions(item.width, item.height, resize);
        const filename = buildOutputFilename(
          item,
          i,
          rename,
          format,
          activePresetName,
          dims
        );
        setExportProgress({
          active: true,
          currentIndex: i + 1,
          total: items.length,
          currentFileName: filename,
          stageLabel: `Downloading ${filename}...`,
        });
        const blob = await exportMediaItem(
          item,
          getLayersForItem(item),
          resize,
          format
        );
        triggerBlobDownload(blob, filename);
        await new Promise((r) => setTimeout(r, 180));
      }
      showToast(`Downloaded ${items.length} files`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExportProgress({
        active: false,
        currentIndex: 0,
        total: 0,
        currentFileName: '',
        stageLabel: '',
      });
    }
  };

  const handleTopBarQuickExport = () => {
    if (items.length === 1 && items[0]) {
      handleExportSingle(items[0]);
    } else if (items.length > 1) {
      handleExportZip();
    }
  };

  const isStageTab =
    activeTab === 'watermark' || activeTab === 'remove-bg' || activeTab === 'resize';

  const inspectorContent =
    activeTab === 'watermark' ? (
      <WatermarkInspector
        layers={currentLayers}
        activeLayerId={activeLayerId}
        onSelectLayer={setActiveLayerId}
        onAddLayer={handleAddLayer}
        onDuplicateLayer={handleDuplicateLayer}
        onRemoveLayer={handleRemoveLayer}
        onUpdateLayer={handleUpdateLayer}
        onCommitLastPlaced={() => commitLastPlaced()}
        presets={presets}
        activePresetId={activePresetId}
        onApplyPreset={handleApplyPreset}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        onImportPresets={handleImportPresets}
      />
    ) : activeTab === 'remove-bg' ? (
      <RemoveBgPanel
        activeItem={activeItem}
        bgConfig={activeBgConfig}
        stageTool={bgStageTool}
        brushRadius={bgBrushRadius}
        onChangeStageTool={setBgStageTool}
        onChangeBrushRadius={setBgBrushRadius}
        onChangeBgConfig={handleChangeBgConfig}
        onAutoSampleBorder={handleAutoSampleBorder}
        onApplyToAllImages={handleApplyBgToAll}
        onResetBg={() => handleChangeBgConfig({ ...DEFAULT_BG_REMOVAL, enabled: true })}
      />
    ) : (
      <ResizeFormatPanel
        activeItem={activeItem}
        layers={currentLayers}
        resize={resize}
        format={format}
        onChangeResize={(patch) => setResize((prev) => ({ ...prev, ...patch }))}
        onChangeFormat={(patch) => setFormat((prev) => ({ ...prev, ...patch }))}
      />
    );

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-[#0E1014] text-[#F3F4F6]">
      <TopBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        itemCount={items.length}
        isExporting={exportProgress.active || exportingSingleId !== null}
        onQuickExport={handleTopBarQuickExport}
      />

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <MediaQueueSidebar
          items={items}
          activeId={activeItem?.id || null}
          syncAllWatermarks={syncAllWatermarks}
          onToggleSyncAll={setSyncAllWatermarks}
          onSelectItem={setActiveId}
          onRemoveItem={handleRemoveItem}
          onClearAll={handleClearAll}
          onUploadFiles={handleUploadFiles}
          lastPlaced={lastPlaced}
          onApplyLastPlaced={handleApplyLastPlaced}
          onRestoreSamples={() => {
            setItems(SAMPLE_MEDIA);
            setActiveId(SAMPLE_MEDIA[0]?.id || null);
          }}
        />

        {isStageTab && (
          <>
            <InteractiveStage
              activeTab={activeTab}
              item={activeItem}
              layers={currentLayers}
              activeLayerId={activeLayerId}
              onSelectLayer={setActiveLayerId}
              onUpdateLayer={handleUpdateLayer}
              onCommitLastPlaced={() => commitLastPlaced()}
              canUndo={historyPast.length > 0}
              canRedo={historyFuture.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              resize={resize}
              format={format}
              presets={presets}
              activePresetId={activePresetId}
              onApplyPreset={handleApplyPreset}
              onUploadFiles={handleUploadFiles}
              onDownloadCurrent={() => activeItem && handleExportSingle(activeItem)}
              isExportingSingle={exportingSingleId === activeItem?.id}
              bgConfig={activeBgConfig}
              bgStageTool={bgStageTool}
              bgBrushRadius={bgBrushRadius}
              onSampleBgColor={(hex) => {
                handleChangeBgConfig({ enabled: true, targetColor: hex });
                setBgStageTool('pan');
                showToast(`Sampled color ${hex}`);
              }}
              onAddBgStroke={handleAddBgStroke}
            />

            {/* DESKTOP (lg+): Always-visible right inspector */}
            <div className="hidden lg:flex">{inspectorContent}</div>

            {/* MOBILE & TABLET (< lg): Thumb-zone Quick Action Bar */}
            <div className="lg:hidden shrink-0 border-t border-white/[0.08] bg-[#12161E] px-3 py-2 flex items-center gap-2">
              {historyPast.length > 0 && activeTab === 'watermark' && (
                <button
                  type="button"
                  onClick={handleUndo}
                  aria-label="Undo"
                  className="min-h-[42px] w-10 rounded-xl bg-[#090B0E] border border-white/[0.1] text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
              )}

              {activeTab === 'watermark' && activeLayer?.type === 'text' && (
                <input
                  type="text"
                  value={activeLayer.text}
                  onChange={(e) => handleUpdateLayer(activeLayer.id, { text: e.target.value })}
                  onBlur={() => commitLastPlaced()}
                  aria-label="Watermark text"
                  className="flex-1 min-w-0 min-h-[42px] px-3 text-xs bg-[#090B0E] border border-white/[0.12] rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              )}
              {activeTab === 'remove-bg' && (
                <button
                  type="button"
                  onClick={() => {
                    if (!activeBgConfig.enabled) {
                      handleAutoSampleBorder();
                    } else {
                      handleChangeBgConfig({ enabled: false });
                    }
                  }}
                  className={`flex-1 min-h-[42px] px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeBgConfig.enabled
                      ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-200'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{activeBgConfig.enabled ? 'Cutout Active' : 'Auto Remove BG'}</span>
                </button>
              )}
              {activeTab === 'resize' && (
                <div className="flex-1 min-w-0 px-2 text-xs font-mono text-slate-300 truncate">
                  {resize.enabled ? `${resize.width}×${resize.height}` : 'Original'} ·{' '}
                  {format.outputFormat === 'original'
                    ? 'Auto'
                    : format.outputFormat.replace('image/', '').toUpperCase()}
                </div>
              )}

              <button
                type="button"
                onClick={() => setMobileSheetOpen(true)}
                className="min-h-[42px] px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-transform shadow-sm"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>
                  {activeTab === 'watermark'
                    ? 'Customize'
                    : activeTab === 'remove-bg'
                      ? 'Sliders'
                      : 'Options'}
                </span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {activeTab === 'rename' && (
          <BulkRenameWorkspace
            items={items}
            rename={rename}
            resize={resize}
            format={format}
            activePresetName={activePresetName}
            onChangeRename={(patch) => setRename((prev) => ({ ...prev, ...patch }))}
          />
        )}

        {activeTab === 'export' && (
          <BatchExportWorkspace
            items={items}
            getLayersForItem={getLayersForItem}
            resize={resize}
            format={format}
            rename={rename}
            activePresetName={activePresetName}
            progress={exportProgress}
            exportingSingleId={exportingSingleId}
            onExportZip={handleExportZip}
            onExportAllIndividual={handleExportAllIndividual}
            onExportSingle={handleExportSingle}
          />
        )}
      </main>

      {/* MOBILE (< md): Thumb-Zone Bottom Tab Navigation */}
      <nav
        aria-label="Mobile workspace navigation"
        className="md:hidden shrink-0 h-[58px] bg-[#101319] border-t border-white/[0.08] grid grid-cols-5 items-center px-1"
      >
        {(
          [
            { id: 'watermark', label: 'Watermark', Icon: Stamp },
            { id: 'remove-bg', label: 'Cutout', Icon: Eraser },
            { id: 'resize', label: 'Resize', Icon: Maximize2 },
            { id: 'rename', label: 'Rename', Icon: FileEdit },
            { id: 'export', label: 'Export', Icon: Archive },
          ] as { id: WorkspaceTab; label: string; Icon: typeof Stamp }[]
        ).map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectTab(id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl cursor-pointer transition-colors ${
                isActive ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* MOBILE & TABLET (< lg): Animated Slide-Up Bottom Sheet Inspector Drawer */}
      <AnimatePresence>
        {isStageTab && mobileSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileSheetOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-[66dvh] max-h-[580px] rounded-t-3xl bg-[#11141B] border-t border-white/[0.14] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="px-4 pt-2.5 pb-2 border-b border-white/[0.08] flex items-center justify-between shrink-0">
                <div className="w-12" aria-hidden="true" />
                <div className="w-10 h-1.5 rounded-full bg-white/20" />
                <button
                  type="button"
                  onClick={() => setMobileSheetOpen(false)}
                  className="min-h-[36px] px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Done</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {inspectorContent}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-[#1C212A] border border-white/[0.14] text-xs font-medium text-white shadow-xl pointer-events-none whitespace-nowrap"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Intro & Welcome Mini-Screen */}
      <StudioIntroGate />
    </div>
  );
}
