import {
  FormatConfig,
  MediaItem,
  RenameConfig,
  ResizeConfig,
  WatermarkLayer,
  WatermarkPreset,
} from '../types/studio';

export interface FontOption {
  name: string;
  family: string;
  category: 'Sans' | 'Serif' | 'Display' | 'Script' | 'Mono';
}

export const WATERMARK_FONTS: FontOption[] = [
  { name: 'Plus Jakarta Sans', family: '"Plus Jakarta Sans", sans-serif', category: 'Sans' },
  { name: 'Montserrat', family: '"Montserrat", sans-serif', category: 'Sans' },
  { name: 'Outfit', family: '"Outfit", sans-serif', category: 'Sans' },
  { name: 'DM Sans', family: '"DM Sans", sans-serif', category: 'Sans' },
  { name: 'Playfair Display', family: '"Playfair Display", serif', category: 'Serif' },
  { name: 'Cormorant Garamond', family: '"Cormorant Garamond", serif', category: 'Serif' },
  { name: 'DM Serif Display', family: '"DM Serif Display", serif', category: 'Serif' },
  { name: 'Lora', family: '"Lora", serif', category: 'Serif' },
  { name: 'Cinzel', family: '"Cinzel", serif', category: 'Serif' },
  { name: 'Bebas Neue', family: '"Bebas Neue", sans-serif', category: 'Display' },
  { name: 'Oswald', family: '"Oswald", sans-serif', category: 'Display' },
  { name: 'Anton', family: '"Anton", sans-serif', category: 'Display' },
  { name: 'Syne', family: '"Syne", sans-serif', category: 'Display' },
  { name: 'Pacifico', family: '"Pacifico", cursive', category: 'Script' },
  { name: 'Caveat', family: '"Caveat", cursive', category: 'Script' },
  { name: 'JetBrains Mono', family: '"JetBrains Mono", monospace', category: 'Mono' },
  { name: 'Space Mono', family: '"Space Mono", monospace', category: 'Mono' },
];

export interface ResizePreset {
  id: string;
  label: string;
  platform: string;
  width: number;
  height: number;
  fitMode: 'cover' | 'contain' | 'max-width';
}

export const RESIZE_PRESETS: ResizePreset[] = [
  { id: 'original', label: 'Original Size', platform: 'Keep Source', width: 0, height: 0, fitMode: 'contain' },
  { id: 'ig-square', label: '1080 × 1080', platform: 'Instagram Square', width: 1080, height: 1080, fitMode: 'cover' },
  { id: 'ig-portrait', label: '1080 × 1350', platform: 'Instagram Portrait (4:5)', width: 1080, height: 1350, fitMode: 'cover' },
  { id: 'ig-story', label: '1080 × 1920', platform: 'Reels / TikTok / Stories', width: 1080, height: 1920, fitMode: 'cover' },
  { id: 'x-post', label: '1600 × 900', platform: 'X / Landscape Post', width: 1600, height: 900, fitMode: 'cover' },
  { id: 'yt-thumb', label: '1280 × 720', platform: 'YouTube Thumbnail', width: 1280, height: 720, fitMode: 'cover' },
  { id: 'og-social', label: '1200 × 628', platform: 'LinkedIn / OpenGraph', width: 1200, height: 628, fitMode: 'cover' },
  { id: 'web-hero', label: '1920w Max', platform: 'Web Hero Downscale', width: 1920, height: 1920, fitMode: 'max-width' },
  { id: 'web-thumb', label: '800w Max', platform: 'Web Card / Blog Thumb', width: 800, height: 800, fitMode: 'max-width' },
];

export const DEFAULT_RESIZE_CONFIG: ResizeConfig = {
  enabled: false,
  presetId: 'original',
  width: 1080,
  height: 1080,
  lockAspect: true,
  fitMode: 'cover',
  backgroundColor: '#0e1014',
};

export const DEFAULT_FORMAT_CONFIG: FormatConfig = {
  outputFormat: 'original',
  quality: 0.88,
  jpegBackground: '#ffffff',
};

export const DEFAULT_RENAME_CONFIG: RenameConfig = {
  enabled: false,
  pattern: '{name}_{n}',
  prefix: '',
  suffix: '_marked',
  find: '',
  replace: '',
  caseInsensitive: true,
  caseTransform: 'none',
  startIndex: 1,
  padLength: 2,
};

export function createDefaultTextLayer(overrides: Partial<WatermarkLayer> = {}): WatermarkLayer {
  return {
    id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: 'Signature Text',
    visible: true,
    type: 'text',
    x: 0.84,
    y: 0.91,
    scale: 0.18,
    rotation: 0,
    opacity: 0.88,
    blendMode: 'source-over',
    marginPct: 0.04,
    placementMode: 'single',
    tileSpacing: 2.2,
    tileAngle: -28,
    customArea: {
      enabled: false,
      x: 0.12,
      y: 0.12,
      width: 0.76,
      height: 0.76,
    },
    text: '@yourhandle',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontWeight: 600,
    italic: false,
    letterSpacing: 0.04,
    color: '#ffffff',
    shadowEnabled: true,
    shadowBlur: 12,
    shadowColor: 'rgba(0,0,0,0.55)',
    strokeEnabled: false,
    strokeWidth: 2,
    strokeColor: '#000000',
    boxEnabled: false,
    boxColor: '#0e1014',
    boxOpacity: 0.65,
    boxPadding: 14,
    boxRadius: 8,
    invertColors: false,
    badgeStyle: 'copyright-ring',
    badgePrimary: 'ALL RIGHTS RESERVED',
    badgeSecondary: '2026',
    ...overrides,
  };
}

export function createDefaultBadgeLayer(overrides: Partial<WatermarkLayer> = {}): WatermarkLayer {
  return createDefaultTextLayer({
    name: 'Studio Stamp',
    type: 'badge',
    x: 0.14,
    y: 0.89,
    scale: 0.16,
    opacity: 0.85,
    badgeStyle: 'exif-bar',
    badgePrimary: 'PRESSMARK STUDIO',
    badgeSecondary: '© 2026',
    color: '#ffffff',
    boxColor: '#0e1014',
    boxOpacity: 0.72,
    ...overrides,
  });
}

export const BUILTIN_PRESETS: WatermarkPreset[] = [
  {
    id: 'preset-corner-signature',
    name: 'Subtle Corner Signature',
    description: 'Clean bottom-right creator handle with soft legibility shadow',
    updatedAt: 1795340000000,
    isBuiltIn: true,
    layers: [
      createDefaultTextLayer({
        id: 'preset-layer-1',
        name: 'Handle Signature',
        text: '@studio.archive',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontWeight: 600,
        x: 0.84,
        y: 0.92,
        scale: 0.18,
        opacity: 0.9,
        shadowEnabled: true,
      }),
    ],
  },
  {
    id: 'preset-diagonal-proof',
    name: 'Diagonal Client Proof',
    description: 'Tiled diagonal proof grid restricted to the center safe zone',
    updatedAt: 1795340000000,
    isBuiltIn: true,
    layers: [
      createDefaultTextLayer({
        id: 'preset-layer-2',
        name: 'Proof Tile',
        text: 'CLIENT PROOF · DO NOT DISTRIBUTE',
        fontFamily: '"Montserrat", sans-serif',
        fontWeight: 700,
        letterSpacing: 0.12,
        x: 0.5,
        y: 0.5,
        scale: 0.28,
        opacity: 0.28,
        placementMode: 'tiled',
        tileSpacing: 2.1,
        tileAngle: -32,
        shadowEnabled: false,
        customArea: {
          enabled: true,
          x: 0.08,
          y: 0.08,
          width: 0.84,
          height: 0.84,
        },
      }),
    ],
  },
  {
    id: 'preset-editorial-serif',
    name: 'Editorial Serif Mark',
    description: 'Centered bottom italic serif signature for photography portfolios',
    updatedAt: 1795340000000,
    isBuiltIn: true,
    layers: [
      createDefaultTextLayer({
        id: 'preset-layer-3',
        name: 'Editorial Credit',
        text: 'Captured by Studio K.',
        fontFamily: '"Playfair Display", serif',
        fontWeight: 600,
        italic: true,
        letterSpacing: 0.03,
        x: 0.5,
        y: 0.92,
        scale: 0.22,
        opacity: 0.92,
        boxEnabled: true,
        boxColor: '#0e1014',
        boxOpacity: 0.48,
        boxPadding: 14,
        boxRadius: 6,
      }),
    ],
  },
  {
    id: 'preset-dual-corners',
    name: 'Dual Corner Protection',
    description: 'Mirrored top-left & bottom-right stamps plus web-ready WebP',
    updatedAt: 1795340000000,
    isBuiltIn: true,
    layers: [
      createDefaultTextLayer({
        id: 'preset-layer-4',
        name: 'Dual Brand Handle',
        text: '© STUDIO PRESS',
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 500,
        letterSpacing: 0.08,
        x: 0.16,
        y: 0.1,
        scale: 0.16,
        opacity: 0.85,
        placementMode: 'corners',
        boxEnabled: true,
        boxColor: '#0e1014',
        boxOpacity: 0.7,
        boxPadding: 10,
        boxRadius: 4,
      }),
    ],
    format: {
      outputFormat: 'image/webp',
      quality: 0.85,
      jpegBackground: '#ffffff',
    },
  },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export const SAMPLE_MEDIA: MediaItem[] = [
  {
    id: 'sample-1',
    name: 'tokyo_street_photographer.jpg',
    url: `${BASE}/src/assets/images/sample_editorial_portrait_1795340320190.jpg`,
    kind: 'image',
    width: 896,
    height: 1152,
    sizeBytes: 384200,
    mimeType: 'image/jpeg',
    isSample: true,
  },
  {
    id: 'sample-2',
    name: 'museum_concrete_facade.jpg',
    url: `${BASE}/src/assets/images/sample_urban_architecture_1795340320564.jpg`,
    kind: 'image',
    width: 1376,
    height: 768,
    sizeBytes: 412800,
    mimeType: 'image/jpeg',
    isSample: true,
  },
  {
    id: 'sample-3',
    name: 'matte_kettle_travertine.jpg',
    url: `${BASE}/src/assets/images/sample_studio_product_1795340320655.jpg`,
    kind: 'image',
    width: 1024,
    height: 1024,
    sizeBytes: 295400,
    mimeType: 'image/jpeg',
    isSample: true,
  },
];
