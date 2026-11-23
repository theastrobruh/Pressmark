import {
  BgRemovalConfig,
  FormatConfig,
  MediaItem,
  RenameConfig,
  ResizeConfig,
  WatermarkLayer,
  WatermarkPreset,
} from '../types/studio';
import sampleEditorialPortrait from '../assets/images/sample_editorial_portrait_1795340320190.jpg';
import sampleStudioProduct from '../assets/images/sample_studio_product_1795340320655.jpg';
import sampleUrbanArchitecture from '../assets/images/sample_urban_architecture_1795340320564.jpg';

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

export const DEFAULT_BG_REMOVAL: BgRemovalConfig = {
  enabled: false,
  mode: 'flood',
  targetColor: '#f3f2ee',
  tolerance: 36,
  softness: 2,
  choke: 0,
  despill: 25,
  edgeContrast: 30,
  protectDetails: 35,
  invertMask: false,
  previewBackdrop: 'checker',
  strokes: [],
};

export function createDefaultTextLayer(overrides: Partial<WatermarkLayer> = {}): WatermarkLayer {
  return {
    id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: 'Bottom Signature',
    visible: true,
    type: 'text',
    x: 0.5,
    y: 0.91,
    scale: 0.22,
    rotation: 0,
    opacity: 0.77,
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
    text: '@Pressmark_webapp',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    fontWeight: 600,
    italic: false,
    letterSpacing: 0.03,
    color: '#ffffff',
    shadowEnabled: true,
    shadowBlur: 14,
    shadowColor: 'rgba(0,0,0,0.65)',
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
    x: 0.5,
    y: 0.9,
    scale: 0.18,
    opacity: 0.77,
    badgeStyle: 'exif-bar',
    badgePrimary: '@Pressmark_webapp',
    badgeSecondary: '© 2026',
    color: '#ffffff',
    boxColor: '#0e1014',
    boxOpacity: 0.72,
    ...overrides,
  });
}

export const BUILTIN_PRESETS: WatermarkPreset[] = [
  {
    id: 'preset-bottom-center-default',
    name: 'Bottom Center Signature',
    description: 'Default @Pressmark_webapp centered at the bottom with 77% opacity',
    updatedAt: 1795420000000,
    isBuiltIn: true,
    layers: [
      createDefaultTextLayer({
        id: 'preset-layer-default',
        name: 'Bottom Center Signature',
        text: '@Pressmark_webapp',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontWeight: 600,
        x: 0.5,
        y: 0.91,
        scale: 0.22,
        opacity: 0.77,
        shadowEnabled: true,
      }),
    ],
  },
  {
    id: 'preset-corner-signature',
    name: 'Subtle Corner Signature',
    description: 'Clean bottom-right creator handle with soft legibility shadow',
    updatedAt: 1795340000000,
    isBuiltIn: true,
    layers: [
      createDefaultTextLayer({
        id: 'preset-layer-1',
        name: 'Corner Handle',
        text: '@Pressmark_webapp',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        fontWeight: 600,
        x: 0.82,
        y: 0.92,
        scale: 0.18,
        opacity: 0.77,
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
        text: '@Pressmark_webapp · PROOF',
        fontFamily: '"Montserrat", sans-serif',
        fontWeight: 700,
        letterSpacing: 0.1,
        x: 0.5,
        y: 0.5,
        scale: 0.26,
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
    description: 'Centered bottom italic serif signature with subtle dark pill backdrop',
    updatedAt: 1795340000000,
    isBuiltIn: true,
    layers: [
      createDefaultTextLayer({
        id: 'preset-layer-3',
        name: 'Editorial Credit',
        text: '@Pressmark_webapp',
        fontFamily: '"Playfair Display", serif',
        fontWeight: 600,
        italic: true,
        letterSpacing: 0.03,
        x: 0.5,
        y: 0.91,
        scale: 0.22,
        opacity: 0.77,
        boxEnabled: true,
        boxColor: '#0e1014',
        boxOpacity: 0.48,
        boxPadding: 14,
        boxRadius: 6,
      }),
    ],
  },
];

export const SAMPLE_MEDIA: MediaItem[] = [
  {
    id: 'sample-3',
    name: 'matte_kettle_travertine.jpg',
    url: sampleStudioProduct,
    kind: 'image',
    width: 1024,
    height: 1024,
    sizeBytes: 295400,
    mimeType: 'image/jpeg',
    isSample: true,
  },
  {
    id: 'sample-1',
    name: 'tokyo_street_photographer.jpg',
    url: sampleEditorialPortrait,
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
    url: sampleUrbanArchitecture,
    kind: 'image',
    width: 1376,
    height: 768,
    sizeBytes: 412800,
    mimeType: 'image/jpeg',
    isSample: true,
  },
];
