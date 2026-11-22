import { useCallback, useEffect, useMemo, useState } from 'react';
import { BatchExportWorkspace } from './components/BatchExportWorkspace';
import { BulkRenameWorkspace } from './components/BulkRenameWorkspace';
import { InteractiveStage } from './components/InteractiveStage';
import { MediaQueueSidebar } from './components/MediaQueueSidebar';
import { ResizeFormatPanel } from './components/ResizeFormatPanel';
import { TopBar } from './components/TopBar';
import { WatermarkInspector } from './components/WatermarkInspector';
import {
  BUILTIN_PRESETS,
  createDefaultBadgeLayer,
  createDefaultTextLayer,
  DEFAULT_FORMAT_CONFIG,
  DEFAULT_RENAME_CONFIG,
  DEFAULT_RESIZE_CONFIG,
  SAMPLE_MEDIA,
} from './constants/presets';
import {
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
import {
  buildOutputFilename,
  computeTargetDimensions,
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

  const [resize, setResize] = useState<ResizeConfig>(DEFAULT_RESIZE_CONFIG);
  const [format, setFormat] = useState<FormatConfig>(DEFAULT_FORMAT_CONFIG);
  const [rename, setRename] = useState<RenameConfig>(DEFAULT_RENAME_CONFIG);

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
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const activeItem = useMemo(
    () => items.find((i) => i.id === activeId) || items[0] || null,
    [items, activeId]
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

  const setCurrentLayers = useCallback(
    (updater: (prev: WatermarkLayer[]) => WatermarkLayer[]) => {
      if (syncAllWatermarks || !activeItem) {
        setSharedLayers((prev) => updater(prev));
      } else {
        setPerItemLayers((prev) => {
          const base = prev[activeItem.id] || cloneLayers(sharedLayers);
          return { ...prev, [activeItem.id]: updater(base) };
        });
      }
    },
    [syncAllWatermarks, activeItem, sharedLayers]
  );

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
        // If only sample media were present, replace samples or append? Keep samples only if user wants, or append cleanly
        const hasOnlySamples = prev.every((i) => i.isSample);
        const next = hasOnlySamples ? parsed : [...prev, ...parsed];
        return next;
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
    });
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
    });
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
    });
  };

  const handleUpdateLayer = (id: string, patch: Partial<WatermarkLayer>) => {
    setActivePresetId(null);
    setCurrentLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const handleApplyPreset = (preset: WatermarkPreset) => {
    const cloned = cloneLayers(preset.layers);
    setCurrentLayers(() => cloned);
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
    setCurrentLayers(() => cloned);
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

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0E1014] text-[#F3F4F6]">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
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

        {activeTab === 'watermark' && (
          <>
            <InteractiveStage
              item={activeItem}
              layers={currentLayers}
              activeLayerId={activeLayerId}
              onSelectLayer={setActiveLayerId}
              onUpdateLayer={handleUpdateLayer}
              onCommitLastPlaced={() => commitLastPlaced()}
              resize={resize}
              format={format}
              onUploadFiles={handleUploadFiles}
              onDownloadCurrent={() => activeItem && handleExportSingle(activeItem)}
              isExportingSingle={exportingSingleId === activeItem?.id}
            />
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
          </>
        )}

        {activeTab === 'resize' && (
          <>
            <InteractiveStage
              item={activeItem}
              layers={currentLayers}
              activeLayerId={activeLayerId}
              onSelectLayer={setActiveLayerId}
              onUpdateLayer={handleUpdateLayer}
              onCommitLastPlaced={() => commitLastPlaced()}
              resize={resize}
              format={format}
              onUploadFiles={handleUploadFiles}
              onDownloadCurrent={() => activeItem && handleExportSingle(activeItem)}
              isExportingSingle={exportingSingleId === activeItem?.id}
            />
            <ResizeFormatPanel
              activeItem={activeItem}
              layers={currentLayers}
              resize={resize}
              format={format}
              onChangeResize={(patch) => setResize((prev) => ({ ...prev, ...patch }))}
              onChangeFormat={(patch) => setFormat((prev) => ({ ...prev, ...patch }))}
            />
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

      {/* Non-intrusive bottom toast feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-[#1C212A] border border-white/[0.14] text-xs font-medium text-white shadow-xl pointer-events-none"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
