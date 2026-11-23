import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { decompressFrames, parseGIF } from 'gifuct-js';
import JSZip from 'jszip';
import {
  FormatConfig,
  MediaItem,
  RenameConfig,
  ResizeConfig,
  WatermarkLayer,
} from '../types/studio';
import {
  buildOutputFilename,
  computeTargetDimensions,
  loadImageAsync,
  renderFullComposite,
  resolveOutputMimeAndExt,
} from './canvasRenderer';
import { processBackgroundRemoval } from './bgRemover';

async function preloadLayerImages(layers: WatermarkLayer[]) {
  await Promise.all(
    layers
      .filter((l) => l.visible && l.type === 'image' && l.imageUrl)
      .map((l) => loadImageAsync(l.imageUrl!).catch(() => null))
  );
}

export async function exportImageBlob(
  item: MediaItem,
  layers: WatermarkLayer[],
  resize: ResizeConfig,
  format: FormatConfig
): Promise<Blob> {
  await preloadLayerImages(layers);
  const img = await loadImageAsync(item.url);
  const srcW = img.naturalWidth || item.width;
  const srcH = img.naturalHeight || item.height;
  const dims = computeTargetDimensions(srcW, srcH, resize);

  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const sourceMedia: CanvasImageSource = item.bgRemoval?.enabled
    ? processBackgroundRemoval(img, srcW, srcH, item.bgRemoval)
    : img;

  renderFullComposite(
    ctx,
    sourceMedia,
    srcW,
    srcH,
    dims.width,
    dims.height,
    layers,
    resize,
    format,
    item.name
  );

  const { mime } = resolveOutputMimeAndExt(item, format);
  const encodeMime = mime === 'image/gif' ? 'image/png' : mime;

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, encodeMime, format.quality)
  );
  if (!blob) throw new Error('Failed to encode output image');
  return blob;
}

export async function exportAnimatedGifBlob(
  item: MediaItem,
  layers: WatermarkLayer[],
  resize: ResizeConfig,
  format: FormatConfig,
  onFrameProgress?: (frame: number, totalFrames: number) => void
): Promise<Blob> {
  // If user explicitly converted GIF to WebP/PNG/JPEG, export first frame in that format
  if (format.outputFormat !== 'original') {
    return exportImageBlob(item, layers, resize, format);
  }

  await preloadLayerImages(layers);
  const resp = await fetch(item.url);
  const buffer = await resp.arrayBuffer();
  const parsed = parseGIF(buffer);
  const frames = decompressFrames(parsed, true);

  if (!frames || frames.length === 0) {
    return exportImageBlob(item, layers, resize, format);
  }

  const srcW = parsed.lsd.width || item.width;
  const srcH = parsed.lsd.height || item.height;
  const dims = computeTargetDimensions(srcW, srcH, resize);

  // Source frame compositor (handles GIF frame disposal properly)
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });

  const patchCanvas = document.createElement('canvas');
  const patchCtx = patchCanvas.getContext('2d');

  const outCanvas = document.createElement('canvas');
  outCanvas.width = dims.width;
  outCanvas.height = dims.height;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });

  if (!srcCtx || !patchCtx || !outCtx) {
    throw new Error('Canvas context unavailable for GIF encoding');
  }

  const encoder = GIFEncoder();
  let previousDisposal = 0;
  let previousDims = { left: 0, top: 0, width: 0, height: 0 };

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (previousDisposal === 2) {
      srcCtx.clearRect(previousDims.left, previousDims.top, previousDims.width, previousDims.height);
    }

    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    const imgData = new ImageData(
      new Uint8ClampedArray(frame.patch),
      frame.dims.width,
      frame.dims.height
    );
    patchCtx.putImageData(imgData, 0, 0);
    srcCtx.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    previousDisposal = frame.disposalType;
    previousDims = frame.dims;

    renderFullComposite(
      outCtx,
      srcCanvas,
      srcW,
      srcH,
      dims.width,
      dims.height,
      layers,
      resize,
      { ...format, outputFormat: 'image/png' },
      item.name
    );

    const outImageData = outCtx.getImageData(0, 0, dims.width, dims.height);
    const palette = quantize(outImageData.data, 256);
    const indexed = applyPalette(outImageData.data, palette);

    encoder.writeFrame(indexed, dims.width, dims.height, {
      palette,
      delay: Math.max(20, frame.delay || 80),
      repeat: 0,
    });

    onFrameProgress?.(i + 1, frames.length);
    if (i % 4 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  encoder.finish();
  const bytes = encoder.bytes();
  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

export async function exportVideoBlob(
  item: MediaItem,
  layers: WatermarkLayer[],
  resize: ResizeConfig,
  format: FormatConfig,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  await preloadLayerImages(layers);

  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.src = item.url;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video for export'));
  });

  const srcW = video.videoWidth || item.width || 1280;
  const srcH = video.videoHeight || item.height || 720;
  const dims = computeTargetDimensions(srcW, srcH, resize);

  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const stream = canvas.captureStream(30);

  // Try preserving audio track if available via captureStream
  try {
    const vWithCapture = video as HTMLVideoElement & { captureStream?: () => MediaStream };
    if (vWithCapture.captureStream) {
      const vStream = vWithCapture.captureStream();
      vStream.getAudioTracks().forEach((track) => stream.addTrack(track));
    }
  } catch {
    // Audio capture not supported on all browsers; continue silently with video track
  }

  const preferredMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';

  const recorder = new MediaRecorder(
    stream,
    preferredMime
      ? { mimeType: preferredMime, videoBitsPerSecond: 6_000_000 }
      : { videoBitsPerSecond: 6_000_000 }
  );

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const completion = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: preferredMime || 'video/webm' }));
    };
    recorder.onerror = () => reject(new Error('Video recording failed'));
  });

  video.currentTime = 0;
  recorder.start(150);
  await video.play();

  const duration = Math.max(0.1, video.duration || 1);
  let rafId = 0;

  const drawFrame = () => {
    renderFullComposite(
      ctx,
      video,
      srcW,
      srcH,
      dims.width,
      dims.height,
      layers,
      resize,
      format,
      item.name
    );
    onProgress?.(Math.min(99, Math.round((video.currentTime / duration) * 100)));

    if (!video.ended && !video.paused) {
      rafId = requestAnimationFrame(drawFrame);
    }
  };

  rafId = requestAnimationFrame(drawFrame);

  await new Promise<void>((resolve) => {
    video.onended = () => {
      cancelAnimationFrame(rafId);
      drawFrame();
      setTimeout(() => {
        recorder.stop();
        resolve();
      }, 120);
    };
  });

  onProgress?.(100);
  return completion;
}

export async function exportMediaItem(
  item: MediaItem,
  layers: WatermarkLayer[],
  resize: ResizeConfig,
  format: FormatConfig,
  onDetailProgress?: (label: string) => void
): Promise<Blob> {
  if (item.kind === 'video') {
    return exportVideoBlob(item, layers, resize, format, (pct) =>
      onDetailProgress?.(`Rendering video (${pct}%)`)
    );
  }
  if (item.kind === 'gif') {
    return exportAnimatedGifBlob(item, layers, resize, format, (f, total) =>
      onDetailProgress?.(`Encoding GIF frame ${f}/${total}`)
    );
  }
  return exportImageBlob(item, layers, resize, format);
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function exportBatchAsZip(
  items: MediaItem[],
  getLayersForItem: (item: MediaItem) => WatermarkLayer[],
  resize: ResizeConfig,
  format: FormatConfig,
  rename: RenameConfig,
  presetName: string,
  onProgress: (index: number, total: number, filename: string, detail: string) => void
): Promise<void> {
  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dims = computeTargetDimensions(item.width, item.height, resize);
    let outName = buildOutputFilename(item, i, rename, format, presetName, dims);

    // Deduplicate identical filenames inside ZIP
    const seen = usedNames.get(outName) || 0;
    usedNames.set(outName, seen + 1);
    if (seen > 0) {
      const dot = outName.lastIndexOf('.');
      outName =
        dot > 0
          ? `${outName.slice(0, dot)}_${seen + 1}${outName.slice(dot)}`
          : `${outName}_${seen + 1}`;
    }

    onProgress(i + 1, items.length, outName, `Processing ${item.kind}...`);
    const layers = getLayersForItem(item);
    const blob = await exportMediaItem(item, layers, resize, format, (detail) =>
      onProgress(i + 1, items.length, outName, detail)
    );
    zip.file(outName, blob);
  }

  onProgress(items.length, items.length, 'pressmark_batch.zip', 'Compressing ZIP archive...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const stamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(zipBlob, `pressmark_export_${stamp}.zip`);
}
