import { BgRemovalConfig } from '../types/studio';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return [255, 255, 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function sampleBorderColor(
  source: CanvasImageSource,
  srcW: number,
  srcH: number
): string {
  const w = Math.min(128, Math.max(8, srcW));
  const h = Math.min(128, Math.max(8, srcH));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#ffffff';

  ctx.drawImage(source, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];

  const pushPx = (x: number, y: number) => {
    const idx = (y * w + x) * 4;
    if (data[idx + 3] > 20) {
      rs.push(data[idx]);
      gs.push(data[idx + 1]);
      bs.push(data[idx + 2]);
    }
  };

  for (let x = 0; x < w; x += 2) {
    pushPx(x, 0);
    pushPx(x, h - 1);
  }
  for (let y = 0; y < h; y += 2) {
    pushPx(0, y);
    pushPx(w - 1, y);
  }

  if (rs.length === 0) return '#ffffff';
  rs.sort((a, b) => a - b);
  gs.sort((a, b) => a - b);
  bs.sort((a, b) => a - b);
  const mid = Math.floor(rs.length / 2);
  return rgbToHex(rs[mid], gs[mid], bs[mid]);
}

export function sampleColorAtPoint(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  normX: number,
  normY: number
): string {
  const canvas = document.createElement('canvas');
  const w = Math.min(512, Math.max(1, srcW));
  const h = Math.min(512, Math.max(1, srcH));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return '#ffffff';
  ctx.drawImage(source, 0, 0, w, h);
  const px = Math.max(0, Math.min(w - 1, Math.round(normX * (w - 1))));
  const py = Math.max(0, Math.min(h - 1, Math.round(normY * (h - 1))));
  const d = ctx.getImageData(px, py, 1, 1).data;
  return rgbToHex(d[0], d[1], d[2]);
}

// Separable morphology (erode / dilate) on single-channel Uint8Array alpha
function morphAlpha(alpha: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const r = Math.min(10, Math.abs(Math.round(radius)));
  if (r === 0) return alpha;
  const isErode = radius < 0;

  const temp = new Uint8Array(alpha.length);
  const out = new Uint8Array(alpha.length);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let val = isErode ? 255 : 0;
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      for (let kx = x0; kx <= x1; kx++) {
        const a = alpha[row + kx];
        if (isErode ? a < val : a > val) val = a;
      }
      temp[row + x] = val;
    }
  }

  // Vertical pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      let val = isErode ? 255 : 0;
      for (let ky = y0; ky <= y1; ky++) {
        const a = temp[ky * w + x];
        if (isErode ? a < val : a > val) val = a;
      }
      out[row + x] = val;
    }
  }

  return out;
}

// Fast 2-pass separable box blur for smooth alpha feathering
function blurAlpha(alpha: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const r = Math.min(20, Math.round(radius));
  if (r <= 0) return alpha;

  const temp = new Uint8Array(alpha.length);
  const out = new Uint8Array(alpha.length);

  // Horizontal sliding window
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    let count = 0;
    for (let x = 0; x <= Math.min(w - 1, r); x++) {
      sum += alpha[row + x];
      count++;
    }
    for (let x = 0; x < w; x++) {
      temp[row + x] = Math.round(sum / count);
      const left = x - r;
      const right = x + r + 1;
      if (left >= 0) {
        sum -= alpha[row + left];
        count--;
      }
      if (right < w) {
        sum += alpha[row + right];
        count++;
      }
    }
  }

  // Vertical sliding window
  for (let x = 0; x < w; x++) {
    let sum = 0;
    let count = 0;
    for (let y = 0; y <= Math.min(h - 1, r); y++) {
      sum += temp[y * w + x];
      count++;
    }
    for (let y = 0; y < h; y++) {
      out[y * w + x] = Math.round(sum / count);
      const top = y - r;
      const bottom = y + r + 1;
      if (top >= 0) {
        sum -= temp[top * w + x];
        count--;
      }
      if (bottom < h) {
        sum += temp[bottom * w + x];
        count++;
      }
    }
  }

  return out;
}

export function processBackgroundRemoval(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  config: BgRemovalConfig,
  options?: { maxDim?: number; rubyMaskOverlay?: boolean }
): HTMLCanvasElement {
  let w = Math.max(1, Math.round(srcW));
  let h = Math.max(1, Math.round(srcH));

  if (options?.maxDim && Math.max(w, h) > options.maxDim) {
    const scale = options.maxDim / Math.max(w, h);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.drawImage(source, 0, 0, w, h);
  if (!config.enabled) return canvas;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const totalPx = w * h;

  const [tr, tg, tb] = hexToRgb(config.targetColor);
  const tol = Math.max(1, config.tolerance);
  const protectFactor = config.protectDetails / 100;
  const ramp = Math.max(8, 12 + config.softness * 1.4);

  let alpha: Uint8Array<ArrayBufferLike> = new Uint8Array(totalPx);

  const colorDist = (r: number, g: number, b: number) => {
    const dr = r - tr;
    const dg = g - tg;
    const db = b - tb;
    // Perceptual redmean weighted distance normalized roughly to 0..255
    const rMean = (r + tr) * 0.5;
    const weightR = 2 + rMean / 256;
    const weightG = 4;
    const weightB = 2 + (255 - rMean) / 256;
    return Math.sqrt((weightR * dr * dr + weightG * dg * dg + weightB * db * db) / 9);
  };

  if (config.mode === 'flood') {
    alpha.fill(255);
    const visited = new Uint8Array(totalPx);
    const queue = new Int32Array(totalPx);
    let head = 0;
    let tail = 0;

    const trySeed = (idx: number) => {
      if (visited[idx]) return;
      const p = idx * 4;
      const d = colorDist(data[p], data[p + 1], data[p + 2]);
      if (d <= tol + ramp * 0.65) {
        visited[idx] = 1;
        queue[tail++] = idx;
      }
    };

    for (let x = 0; x < w; x++) {
      trySeed(x);
      trySeed((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      trySeed(y * w);
      trySeed(y * w + (w - 1));
    }

    const effectiveTol = tol * (1 - protectFactor * 0.22);

    while (head < tail) {
      const idx = queue[head++];
      const p = idx * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const dist = colorDist(r, g, b);

      if (dist <= effectiveTol) {
        alpha[idx] = 0;
      } else {
        const t = Math.min(1, (dist - effectiveTol) / ramp);
        alpha[idx] = Math.round(t * 255);
      }

      // Propagate to 4-neighbors if pixel is predominantly background
      if (dist <= effectiveTol + ramp * 0.45) {
        const x = idx % w;
        const y = (idx - x) / w;
        if (x > 0) {
          const n = idx - 1;
          if (!visited[n]) {
            const np = n * 4;
            if (colorDist(data[np], data[np + 1], data[np + 2]) <= effectiveTol + ramp * 0.7) {
              visited[n] = 1;
              queue[tail++] = n;
            }
          }
        }
        if (x < w - 1) {
          const n = idx + 1;
          if (!visited[n]) {
            const np = n * 4;
            if (colorDist(data[np], data[np + 1], data[np + 2]) <= effectiveTol + ramp * 0.7) {
              visited[n] = 1;
              queue[tail++] = n;
            }
          }
        }
        if (y > 0) {
          const n = idx - w;
          if (!visited[n]) {
            const np = n * 4;
            if (colorDist(data[np], data[np + 1], data[np + 2]) <= effectiveTol + ramp * 0.7) {
              visited[n] = 1;
              queue[tail++] = n;
            }
          }
        }
        if (y < h - 1) {
          const n = idx + w;
          if (!visited[n]) {
            const np = n * 4;
            if (colorDist(data[np], data[np + 1], data[np + 2]) <= effectiveTol + ramp * 0.7) {
              visited[n] = 1;
              queue[tail++] = n;
            }
          }
        }
      }
    }
  } else if (config.mode === 'global') {
    const effectiveTol = tol * (1 - protectFactor * 0.25);
    for (let i = 0; i < totalPx; i++) {
      const p = i * 4;
      const dist = colorDist(data[p], data[p + 1], data[p + 2]);
      if (dist <= effectiveTol) {
        alpha[i] = 0;
      } else if (dist < effectiveTol + ramp) {
        alpha[i] = Math.round(((dist - effectiveTol) / ramp) * 255);
      } else {
        alpha[i] = 255;
      }
    }
  } else if (config.mode === 'luma-light') {
    // High luminance + low saturation white/light background remover
    const lumaThresh = Math.max(85, 255 - tol * 1.15);
    for (let i = 0; i < totalPx; i++) {
      const p = i * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      const satPenalty = sat * (90 + protectFactor * 140);
      const score = luma - satPenalty;

      if (score >= lumaThresh + ramp * 0.5) {
        alpha[i] = 0;
      } else if (score > lumaThresh - ramp * 0.5) {
        alpha[i] = Math.round(((lumaThresh + ramp * 0.5 - score) / ramp) * 255);
      } else {
        alpha[i] = 255;
      }
    }
  } else {
    // luma-dark: dark/black background remover
    const darkThresh = Math.min(190, tol * 1.15);
    for (let i = 0; i < totalPx; i++) {
      const p = i * 4;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      const satBoost = sat * (55 + protectFactor * 95);
      const score = luma + satBoost;

      if (score <= darkThresh - ramp * 0.5) {
        alpha[i] = 0;
      } else if (score < darkThresh + ramp * 0.5) {
        alpha[i] = Math.round(((score - (darkThresh - ramp * 0.5)) / ramp) * 255);
      } else {
        alpha[i] = 255;
      }
    }
  }

  // Apply manual Erase / Restore brush strokes before edge refinement
  if (config.strokes.length > 0) {
    const minDim = Math.min(w, h);
    for (const stroke of config.strokes) {
      const cx = stroke.x * w;
      const cy = stroke.y * h;
      const rad = Math.max(2, stroke.radius * minDim);
      const radSq = rad * rad;
      const x0 = Math.max(0, Math.floor(cx - rad));
      const x1 = Math.min(w - 1, Math.ceil(cx + rad));
      const y0 = Math.max(0, Math.floor(cy - rad));
      const y1 = Math.min(h - 1, Math.ceil(cy + rad));
      const targetVal = stroke.type === 'erase' ? 0 : 255;

      for (let y = y0; y <= y1; y++) {
        const dy = y - cy;
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          const dSq = dx * dx + dy * dy;
          if (dSq <= radSq) {
            const d = Math.sqrt(dSq) / rad;
            const blend = d < 0.7 ? 1 : 1 - (d - 0.7) / 0.3;
            const idx = y * w + x;
            alpha[idx] = Math.round(alpha[idx] * (1 - blend) + targetVal * blend);
          }
        }
      }
    }
  }

  // Invert Mask if requested
  if (config.invertMask) {
    for (let i = 0; i < totalPx; i++) {
      alpha[i] = 255 - alpha[i];
    }
  }

  // Choke / Expand morphological edge trim
  if (config.choke !== 0) {
    const scaledChoke = options?.maxDim
      ? Math.round(config.choke * (w / Math.max(1, srcW)))
      : config.choke;
    const effectiveChoke = scaledChoke === 0 && config.choke !== 0 ? Math.sign(config.choke) : scaledChoke;
    alpha = morphAlpha(alpha, w, h, effectiveChoke);
  }

  // Edge Feather / Softness
  if (config.softness > 0) {
    const scaledSoft = options?.maxDim
      ? Math.max(1, Math.round(config.softness * (w / Math.max(1, srcW))))
      : config.softness;
    alpha = blurAlpha(alpha, w, h, scaledSoft);
  }

  // Edge Contrast / Alpha Refine
  const contrastAmt = config.edgeContrast / 100;
  if (contrastAmt > 0.02) {
    const slope = 1 + contrastAmt * 4.5;
    for (let i = 0; i < totalPx; i++) {
      const a = alpha[i];
      if (a > 0 && a < 255) {
        const norm = a / 255;
        const refined = Math.max(0, Math.min(1, (norm - 0.5) * slope + 0.5));
        alpha[i] = Math.round(refined * 255);
      }
    }
  }

  // Despill & Final Alpha Application (or Ruby Mask Visualization)
  const despillAmt = config.despill / 100;
  const isRuby = Boolean(options?.rubyMaskOverlay);

  for (let i = 0; i < totalPx; i++) {
    const p = i * 4;
    const origA = data[p + 3];
    const maskA = alpha[i];

    if (isRuby) {
      if (maskA < 235) {
        const cutStrength = (255 - maskA) / 255;
        data[p] = Math.round(data[p] * (1 - cutStrength * 0.65) + 239 * cutStrength * 0.65);
        data[p + 1] = Math.round(data[p + 1] * (1 - cutStrength * 0.72) + 45 * cutStrength * 0.72);
        data[p + 2] = Math.round(data[p + 2] * (1 - cutStrength * 0.72) + 68 * cutStrength * 0.72);
      }
      data[p + 3] = origA;
      continue;
    }

    const finalA = Math.round((origA * maskA) / 255);

    if (despillAmt > 0 && finalA > 0 && finalA < 250) {
      // Remove residual background color bounce from semi-transparent edge pixels
      const edgeMix = (1 - finalA / 255) * despillAmt * 0.85;
      const luma = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      const neutralR = data[p] - (tr - luma) * edgeMix;
      const neutralG = data[p + 1] - (tg - luma) * edgeMix;
      const neutralB = data[p + 2] - (tb - luma) * edgeMix;
      data[p] = Math.max(0, Math.min(255, Math.round(neutralR)));
      data[p + 1] = Math.max(0, Math.min(255, Math.round(neutralG)));
      data[p + 2] = Math.max(0, Math.min(255, Math.round(neutralB)));
    }

    data[p + 3] = finalA;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
