import {
  FormatConfig,
  MediaItem,
  RenameConfig,
  ResizeConfig,
  WatermarkLayer,
} from '../types/studio';

const logoImageCache = new Map<string, HTMLImageElement>();
const tintedLogoCache = new Map<string, HTMLCanvasElement>();

export function getCachedLogoImage(url: string): HTMLImageElement | null {
  if (!url) return null;
  const cached = logoImageCache.get(url);
  if (cached && cached.complete) return cached;
  if (!cached) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    logoImageCache.set(url, img);
  }
  return null;
}

export function loadImageAsync(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const existing = logoImageCache.get(url);
    if (existing && existing.complete && existing.naturalWidth > 0) {
      resolve(existing);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      logoImageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function computeTargetDimensions(
  srcWidth: number,
  srcHeight: number,
  resize: ResizeConfig
): { width: number; height: number } {
  const safeSrcW = Math.max(1, Math.round(srcWidth));
  const safeSrcH = Math.max(1, Math.round(srcHeight));

  if (!resize.enabled || resize.presetId === 'original') {
    return { width: safeSrcW, height: safeSrcH };
  }

  const reqW = Math.max(16, Math.round(resize.width || safeSrcW));
  const reqH = Math.max(16, Math.round(resize.height || safeSrcH));

  if (resize.fitMode === 'max-width') {
    if (safeSrcW <= reqW) {
      return { width: safeSrcW, height: safeSrcH };
    }
    const ratio = reqW / safeSrcW;
    return {
      width: reqW,
      height: Math.max(1, Math.round(safeSrcH * ratio)),
    };
  }

  return { width: reqW, height: reqH };
}

export function resolveOutputMimeAndExt(
  item: MediaItem,
  format: FormatConfig
): { mime: string; ext: string } {
  if (item.kind === 'video') {
    return { mime: 'video/webm', ext: 'webm' };
  }
  if (item.kind === 'gif' && format.outputFormat === 'original') {
    return { mime: 'image/gif', ext: 'gif' };
  }
  if (format.outputFormat === 'original') {
    const lower = item.name.toLowerCase();
    if (lower.endsWith('.png') || item.mimeType === 'image/png') {
      return { mime: 'image/png', ext: 'png' };
    }
    if (lower.endsWith('.webp') || item.mimeType === 'image/webp') {
      return { mime: 'image/webp', ext: 'webp' };
    }
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  switch (format.outputFormat) {
    case 'image/webp':
      return { mime: 'image/webp', ext: 'webp' };
    case 'image/png':
      return { mime: 'image/png', ext: 'png' };
    case 'image/jpeg':
    default:
      return { mime: 'image/jpeg', ext: 'jpg' };
  }
}

export function buildOutputFilename(
  item: MediaItem,
  index: number,
  rename: RenameConfig,
  format: FormatConfig,
  presetName: string,
  targetDims: { width: number; height: number }
): string {
  const { ext } = resolveOutputMimeAndExt(item, format);
  const dotIdx = item.name.lastIndexOf('.');
  const rawBase = dotIdx > 0 ? item.name.slice(0, dotIdx) : item.name;

  if (!rename.enabled) {
    return `${rawBase}.${ext}`;
  }

  let base = rawBase;

  // Find & Replace
  if (rename.find) {
    try {
      const escaped = rename.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, rename.caseInsensitive ? 'gi' : 'g');
      base = base.replace(regex, rename.replace);
    } catch {
      base = base.split(rename.find).join(rename.replace);
    }
  }

  const seqNum = String(rename.startIndex + index).padStart(
    Math.max(1, rename.padLength),
    '0'
  );
  const today = new Date().toISOString().slice(0, 10);
  const cleanPreset = (presetName || 'preset')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const pattern = rename.pattern.trim() || '{name}';
  let formatted = pattern
    .replace(/\{name\}/g, base)
    .replace(/\{n\}/g, seqNum)
    .replace(/\{date\}/g, today)
    .replace(/\{preset\}/g, cleanPreset)
    .replace(/\{w\}/g, String(targetDims.width))
    .replace(/\{h\}/g, String(targetDims.height));

  formatted = `${rename.prefix}${formatted}${rename.suffix}`;

  switch (rename.caseTransform) {
    case 'lower':
      formatted = formatted.toLowerCase();
      break;
    case 'upper':
      formatted = formatted.toUpperCase();
      break;
    case 'kebab':
      formatted = formatted
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      break;
    case 'snake':
      formatted = formatted
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
      break;
    default:
      break;
  }

  const safeName = formatted.replace(/[\\/:*?"<>|]/g, '_') || `asset_${seqNum}`;
  return `${safeName}.${ext}`;
}

export function resolveWatermarkTokens(text: string, mediaName?: string): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const date = now.toISOString().slice(0, 10);
  const dotIdx = mediaName ? mediaName.lastIndexOf('.') : -1;
  const cleanFile = mediaName ? (dotIdx > 0 ? mediaName.slice(0, dotIdx) : mediaName) : 'media';

  return text
    .replace(/\{year\}/gi, year)
    .replace(/\{date\}/gi, date)
    .replace(/\{filename\}/gi, cleanFile);
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hex;
}

function measureSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacingPx: number
): number {
  if (!text) return 0;
  if (Math.abs(letterSpacingPx) < 0.05) {
    return ctx.measureText(text).width;
  }
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    total += ctx.measureText(text[i]).width;
    if (i < text.length - 1) total += letterSpacingPx;
  }
  return total;
}

function fillOrStrokeSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  xCenter: number,
  yCenter: number,
  letterSpacingPx: number,
  mode: 'fill' | 'stroke'
) {
  if (Math.abs(letterSpacingPx) < 0.05) {
    if (mode === 'fill') ctx.fillText(text, xCenter, yCenter);
    else ctx.strokeText(text, xCenter, yCenter);
    return;
  }
  const totalWidth = measureSpacedText(ctx, text, letterSpacingPx);
  let cursor = xCenter - totalWidth / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (mode === 'fill') ctx.fillText(ch, cursor, yCenter);
    else ctx.strokeText(ch, cursor, yCenter);
    cursor += ctx.measureText(ch).width + letterSpacingPx;
  }
  ctx.textAlign = prevAlign;
}

function getProcessedLogoCanvas(
  img: HTMLImageElement,
  invert: boolean,
  tintColor?: string
): HTMLCanvasElement | HTMLImageElement {
  if (!invert && !tintColor) return img;
  const key = `${img.src}::${invert}::${tintColor || ''}`;
  const cached = tintedLogoCache.get(key);
  if (cached) return cached;

  const off = document.createElement('canvas');
  off.width = img.naturalWidth || img.width || 256;
  off.height = img.naturalHeight || img.height || 256;
  const octx = off.getContext('2d');
  if (!octx) return img;

  octx.drawImage(img, 0, 0, off.width, off.height);

  if (tintColor) {
    octx.globalCompositeOperation = 'source-in';
    octx.fillStyle = tintColor;
    octx.fillRect(0, 0, off.width, off.height);
  } else if (invert) {
    const imageData = octx.getImageData(0, 0, off.width, off.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 255 - d[i];
      d[i + 1] = 255 - d[i + 1];
      d[i + 2] = 255 - d[i + 2];
    }
    octx.putImageData(imageData, 0, 0);
  }

  tintedLogoCache.set(key, off);
  return off;
}

export function getLayerSizeMetrics(
  layer: WatermarkLayer,
  canvasWidth: number,
  canvasHeight: number,
  mediaName?: string
): { width: number; height: number } {
  const baseDim = Math.min(canvasWidth, canvasHeight);
  const targetWidth = Math.max(24, layer.scale * baseDim * 1.45);

  if (layer.type === 'image' && layer.imageUrl) {
    const imgW = layer.imageWidth || 200;
    const imgH = layer.imageHeight || 200;
    const aspect = imgH / Math.max(1, imgW);
    return {
      width: targetWidth,
      height: targetWidth * aspect,
    };
  }

  if (layer.type === 'badge') {
    if (layer.badgeStyle === 'copyright-ring') {
      const size = Math.max(44, layer.scale * baseDim * 0.9);
      return { width: size, height: size };
    }
    if (layer.badgeStyle === 'minimal-frame') {
      const w = Math.max(90, layer.scale * baseDim * 1.3);
      return { width: w, height: w * 0.42 };
    }
    const w = Math.max(110, layer.scale * baseDim * 1.5);
    return { width: w, height: Math.max(28, w * 0.25) };
  }

  // Text measurement
  const fontSize = Math.max(12, Math.round(layer.scale * baseDim * 0.28));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: fontSize * 5, height: fontSize * 1.4 };

  const stylePrefix = layer.italic ? 'italic ' : '';
  ctx.font = `${stylePrefix}${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`;
  const display = resolveWatermarkTokens(layer.text || 'Watermark', mediaName);
  const lines = display.split('\n');
  const spacingPx = layer.letterSpacing * fontSize;
  let maxW = 0;
  for (const line of lines) {
    maxW = Math.max(maxW, measureSpacedText(ctx, line, spacingPx));
  }
  const lineH = fontSize * 1.25;
  const pad = layer.boxEnabled ? (layer.boxPadding / 100) * fontSize * 4.2 : 0;
  return {
    width: maxW + pad * 2,
    height: lines.length * lineH + pad * 1.4,
  };
}

function drawSingleWatermarkInstance(
  ctx: CanvasRenderingContext2D,
  layer: WatermarkLayer,
  cx: number,
  cy: number,
  canvasWidth: number,
  canvasHeight: number,
  rotationDeg: number,
  mediaName?: string
) {
  const baseDim = Math.min(canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
  ctx.globalCompositeOperation = layer.blendMode;

  if (layer.type === 'text') {
    const fontSize = Math.max(12, Math.round(layer.scale * baseDim * 0.28));
    const stylePrefix = layer.italic ? 'italic ' : '';
    ctx.font = `${stylePrefix}${layer.fontWeight} ${fontSize}px ${layer.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const display = resolveWatermarkTokens(layer.text || 'Watermark', mediaName);
    const lines = display.split('\n');
    const spacingPx = layer.letterSpacing * fontSize;
    const lineH = fontSize * 1.24;

    let maxW = 0;
    for (const line of lines) {
      maxW = Math.max(maxW, measureSpacedText(ctx, line, spacingPx));
    }
    const totalH = lines.length * lineH;

    if (layer.boxEnabled) {
      const padX = Math.max(6, (layer.boxPadding / 20) * fontSize * 0.75);
      const padY = Math.max(4, (layer.boxPadding / 20) * fontSize * 0.48);
      const boxW = maxW + padX * 2;
      const boxH = totalH + padY * 2;
      const radius = Math.min(boxH / 2, (layer.boxRadius / 20) * fontSize * 0.7);
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = hexToRgba(layer.boxColor, layer.boxOpacity);
      drawRoundedRectPath(ctx, -boxW / 2, -boxH / 2, boxW, boxH, radius);
      ctx.fill();
      ctx.restore();
    }

    if (layer.shadowEnabled) {
      ctx.shadowColor = layer.shadowColor;
      ctx.shadowBlur = Math.max(1, (layer.shadowBlur / 24) * fontSize * 0.45);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.max(1, fontSize * 0.06);
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    const startY = -((lines.length - 1) * lineH) / 2;
    lines.forEach((line, idx) => {
      const ly = startY + idx * lineH;
      if (layer.strokeEnabled && layer.strokeWidth > 0) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(1, (layer.strokeWidth / 12) * fontSize * 0.3);
        ctx.strokeStyle = layer.strokeColor;
        fillOrStrokeSpacedText(ctx, line, 0, ly, spacingPx, 'stroke');
      }
      ctx.fillStyle = layer.color;
      fillOrStrokeSpacedText(ctx, line, 0, ly, spacingPx, 'fill');
    });
  } else if (layer.type === 'image' && layer.imageUrl) {
    const img = getCachedLogoImage(layer.imageUrl);
    if (img && img.naturalWidth > 0) {
      const drawW = Math.max(24, layer.scale * baseDim * 1.45);
      const drawH = drawW * (img.naturalHeight / img.naturalWidth);
      const source = getProcessedLogoCanvas(img, layer.invertColors, layer.tintColor);

      if (layer.shadowEnabled) {
        ctx.shadowColor = layer.shadowColor;
        ctx.shadowBlur = Math.max(2, layer.shadowBlur * 0.8);
        ctx.shadowOffsetY = 2;
      }
      ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
    }
  } else if (layer.type === 'badge') {
    const primary = resolveWatermarkTokens(layer.badgePrimary || 'PRESSMARK', mediaName);
    const secondary = resolveWatermarkTokens(layer.badgeSecondary || '© 2026', mediaName);

    if (layer.badgeStyle === 'copyright-ring') {
      const size = Math.max(48, layer.scale * baseDim * 0.9);
      const r = size / 2;
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = Math.max(1.5, size * 0.035);
      ctx.beginPath();
      ctx.arc(0, 0, r - ctx.lineWidth, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = Math.max(1, size * 0.014);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = layer.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(size * 0.22)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(secondary.slice(0, 8), 0, -size * 0.11);
      ctx.font = `600 ${Math.round(size * 0.12)}px "JetBrains Mono", monospace`;
      ctx.fillText(primary.slice(0, 14), 0, size * 0.16);
    } else if (layer.badgeStyle === 'exif-bar') {
      const w = Math.max(130, layer.scale * baseDim * 1.55);
      const h = Math.max(28, w * 0.24);
      ctx.fillStyle = hexToRgba(layer.boxColor, layer.boxOpacity);
      drawRoundedRectPath(ctx, -w / 2, -h / 2, w, h, h * 0.18);
      ctx.fill();

      ctx.strokeStyle = hexToRgba(layer.color, 0.28);
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = layer.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.round(h * 0.34)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(primary.slice(0, 18), -w / 2 + h * 0.38, 0);

      ctx.textAlign = 'right';
      ctx.font = `500 ${Math.round(h * 0.3)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = hexToRgba(layer.color, 0.75);
      ctx.fillText(secondary.slice(0, 10), w / 2 - h * 0.38, 0);
    } else if (layer.badgeStyle === 'corner-tag') {
      const w = Math.max(110, layer.scale * baseDim * 1.45);
      const h = Math.max(26, w * 0.24);
      ctx.fillStyle = hexToRgba(layer.boxColor, layer.boxOpacity);
      drawRoundedRectPath(ctx, -w / 2, -h / 2, w, h, 4);
      ctx.fill();

      ctx.fillStyle = layer.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(h * 0.36)}px "Montserrat", sans-serif`;
      ctx.fillText(`${primary} · ${secondary}`.slice(0, 26), 0, 0);
    } else {
      // minimal-frame
      const w = Math.max(100, layer.scale * baseDim * 1.35);
      const h = w * 0.42;
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = Math.max(1.5, w * 0.015);
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      ctx.fillStyle = layer.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(h * 0.26)}px "Cinzel", serif`;
      ctx.fillText(primary.slice(0, 18), 0, -h * 0.12);
      ctx.font = `500 ${Math.round(h * 0.18)}px "DM Sans", sans-serif`;
      ctx.fillText(secondary.slice(0, 18), 0, h * 0.18);
    }
  }

  ctx.restore();
}

export function renderLayersToContext(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  layers: WatermarkLayer[],
  mediaName?: string
) {
  for (const layer of layers) {
    if (!layer.visible) continue;

    ctx.save();

    // Custom Area clipping
    const areaX = layer.customArea.enabled ? layer.customArea.x * canvasWidth : 0;
    const areaY = layer.customArea.enabled ? layer.customArea.y * canvasHeight : 0;
    const areaW = layer.customArea.enabled ? layer.customArea.width * canvasWidth : canvasWidth;
    const areaH = layer.customArea.enabled ? layer.customArea.height * canvasHeight : canvasHeight;

    if (layer.customArea.enabled) {
      ctx.beginPath();
      ctx.rect(areaX, areaY, areaW, areaH);
      ctx.clip();
    }

    if (layer.placementMode === 'tiled') {
      const metrics = getLayerSizeMetrics(layer, canvasWidth, canvasHeight, mediaName);
      const stepX = Math.max(40, metrics.width * layer.tileSpacing * 0.72);
      const stepY = Math.max(40, metrics.height * layer.tileSpacing * 1.35);
      const diag = Math.hypot(areaW, areaH);
      const centerX = areaX + areaW / 2;
      const centerY = areaY + areaH / 2;
      const angleRad = (layer.tileAngle * Math.PI) / 180;

      const cols = Math.ceil(diag / stepX) + 2;
      const rows = Math.ceil(diag / stepY) + 2;

      for (let r = -rows; r <= rows; r++) {
        const offsetRow = r % 2 === 0 ? 0 : stepX * 0.5;
        for (let c = -cols; c <= cols; c++) {
          const lx = c * stepX + offsetRow;
          const ly = r * stepY;
          const rx = centerX + lx * Math.cos(angleRad) - ly * Math.sin(angleRad);
          const ry = centerY + lx * Math.sin(angleRad) + ly * Math.cos(angleRad);
          drawSingleWatermarkInstance(
            ctx,
            layer,
            rx,
            ry,
            canvasWidth,
            canvasHeight,
            layer.tileAngle + layer.rotation,
            mediaName
          );
        }
      }
    } else if (layer.placementMode === 'corners') {
      const padX = Math.max(24, canvasWidth * Math.max(0.06, layer.marginPct));
      const padY = Math.max(20, canvasHeight * Math.max(0.06, layer.marginPct));
      const x1 = areaX + padX;
      const y1 = areaY + padY;
      const x2 = areaX + areaW - padX;
      const y2 = areaY + areaH - padY;
      drawSingleWatermarkInstance(
        ctx,
        layer,
        x1,
        y1,
        canvasWidth,
        canvasHeight,
        layer.rotation,
        mediaName
      );
      drawSingleWatermarkInstance(
        ctx,
        layer,
        x2,
        y2,
        canvasWidth,
        canvasHeight,
        layer.rotation,
        mediaName
      );
    } else {
      // Single placement
      const px = layer.x * canvasWidth;
      const py = layer.y * canvasHeight;
      drawSingleWatermarkInstance(
        ctx,
        layer,
        px,
        py,
        canvasWidth,
        canvasHeight,
        layer.rotation,
        mediaName
      );
    }

    ctx.restore();
  }
}

export function renderFullComposite(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
  layers: WatermarkLayer[],
  resize: ResizeConfig,
  format: FormatConfig,
  mediaName?: string
) {
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  // Fill background for JPEG or letterbox contain mode
  const needsOpaqueBg =
    format.outputFormat === 'image/jpeg' ||
    (resize.enabled && resize.fitMode === 'contain');

  if (needsOpaqueBg) {
    ctx.fillStyle =
      format.outputFormat === 'image/jpeg' && (!resize.enabled || resize.fitMode !== 'contain')
        ? format.jpegBackground
        : resize.backgroundColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  // Compute source draw rectangle
  if (!resize.enabled || resize.presetId === 'original' || resize.fitMode === 'stretch' || resize.fitMode === 'max-width') {
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  } else if (resize.fitMode === 'contain') {
    const scale = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
    const drawW = srcWidth * scale;
    const drawH = srcHeight * scale;
    const dx = (targetWidth - drawW) / 2;
    const dy = (targetHeight - drawH) / 2;
    ctx.drawImage(source, dx, dy, drawW, drawH);
  } else {
    // cover
    const scale = Math.max(targetWidth / srcWidth, targetHeight / srcHeight);
    const cropW = targetWidth / scale;
    const cropH = targetHeight / scale;
    const sx = (srcWidth - cropW) / 2;
    const sy = (srcHeight - cropH) / 2;
    ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, targetWidth, targetHeight);
  }

  renderLayersToContext(ctx, targetWidth, targetHeight, layers, mediaName);
}

export async function estimateOutputSize(
  item: MediaItem,
  layers: WatermarkLayer[],
  resize: ResizeConfig,
  format: FormatConfig
): Promise<{ estimatedBytes: number; targetWidth: number; targetHeight: number } | null> {
  if (item.kind === 'video') return null;

  try {
    const img = await loadImageAsync(item.url);
    const dims = computeTargetDimensions(item.width, item.height, resize);
    const canvas = document.createElement('canvas');
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Preload any logo layers first
    for (const l of layers) {
      if (l.visible && l.type === 'image' && l.imageUrl) {
        await loadImageAsync(l.imageUrl).catch(() => null);
      }
    }

    renderFullComposite(
      ctx,
      img,
      item.width,
      item.height,
      dims.width,
      dims.height,
      layers,
      resize,
      format,
      item.name
    );

    const { mime } = resolveOutputMimeAndExt(item, format);
    const targetMime = mime === 'image/gif' ? 'image/png' : mime;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, targetMime, format.quality)
    );
    if (!blob) return null;

    return {
      estimatedBytes: blob.size,
      targetWidth: dims.width,
      targetHeight: dims.height,
    };
  } catch {
    return null;
  }
}
