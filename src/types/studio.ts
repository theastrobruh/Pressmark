export type MediaKind = 'image' | 'gif' | 'video';

export type BgRemovalMode = 'flood' | 'global' | 'luma-light' | 'luma-dark';
export type BgPreviewBackdrop = 'checker' | 'dark' | 'light' | 'green' | 'ruby';

export interface BgBrushStroke {
  type: 'erase' | 'restore';
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  radius: number; // normalized to min dimension (0.01..0.15)
}

export interface BgRemovalConfig {
  enabled: boolean;
  mode: BgRemovalMode;
  targetColor: string; // hex e.g. #ffffff
  tolerance: number; // 0..140
  softness: number; // 0..20 px (edge feather)
  choke: number; // -10..10 px (shrink/expand mask)
  despill: number; // 0..100 %
  edgeContrast: number; // 0..100 %
  protectDetails: number; // 0..100 %
  invertMask: boolean;
  previewBackdrop: BgPreviewBackdrop;
  strokes: BgBrushStroke[];
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  file?: File;
  kind: MediaKind;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  durationSec?: number;
  isSample?: boolean;
  bgRemoval?: BgRemovalConfig;
}

export type WatermarkType = 'text' | 'image' | 'badge';
export type PlacementMode = 'single' | 'tiled' | 'corners';
export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
export type BadgeStyle = 'copyright-ring' | 'exif-bar' | 'corner-tag' | 'minimal-frame';

export interface CustomArea {
  enabled: boolean;
  x: number; // 0..1 left
  y: number; // 0..1 top
  width: number; // 0..1
  height: number; // 0..1
}

export interface WatermarkLayer {
  id: string;
  name: string;
  visible: boolean;
  type: WatermarkType;

  // Normalized coordinates (0..1 relative to canvas)
  x: number;
  y: number;
  scale: number; // 0.04..0.85 relative to base dimension
  rotation: number; // -180..180 deg
  opacity: number; // 0.05..1
  blendMode: BlendMode;
  marginPct: number; // 0..0.15 safe padding from edges

  // Placement & tiling
  placementMode: PlacementMode;
  tileSpacing: number; // 1.1..4.0 multiplier
  tileAngle: number; // -60..60 deg for tiled grid
  customArea: CustomArea;

  // Text properties
  text: string;
  fontFamily: string;
  fontWeight: number;
  italic: boolean;
  letterSpacing: number; // -0.05..0.5 em
  color: string;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowColor: string;
  strokeEnabled: boolean;
  strokeWidth: number;
  strokeColor: string;
  boxEnabled: boolean;
  boxColor: string;
  boxOpacity: number;
  boxPadding: number;
  boxRadius: number;

  // Logo/image properties
  imageUrl?: string;
  imageName?: string;
  imageWidth?: number;
  imageHeight?: number;
  invertColors: boolean;
  tintColor?: string;

  // Badge properties
  badgeStyle: BadgeStyle;
  badgePrimary: string;
  badgeSecondary: string;
}

export type ResizeFitMode = 'cover' | 'contain' | 'stretch' | 'max-width';

export interface ResizeConfig {
  enabled: boolean;
  presetId: string;
  width: number;
  height: number;
  lockAspect: boolean;
  fitMode: ResizeFitMode;
  backgroundColor: string;
}

export type OutputFormat = 'original' | 'image/webp' | 'image/jpeg' | 'image/png';

export interface FormatConfig {
  outputFormat: OutputFormat;
  quality: number; // 0.1..1.0
  jpegBackground: string;
}

export type RenameCaseTransform = 'none' | 'lower' | 'upper' | 'kebab' | 'snake';

export interface RenameConfig {
  enabled: boolean;
  pattern: string;
  prefix: string;
  suffix: string;
  find: string;
  replace: string;
  caseInsensitive: boolean;
  caseTransform: RenameCaseTransform;
  startIndex: number;
  padLength: number;
}

export interface WatermarkPreset {
  id: string;
  name: string;
  description: string;
  updatedAt: number;
  layers: WatermarkLayer[];
  resize?: ResizeConfig;
  format?: FormatConfig;
  isBuiltIn?: boolean;
}

export type WorkspaceTab = 'watermark' | 'remove-bg' | 'resize' | 'rename' | 'export';

export interface ExportProgress {
  active: boolean;
  currentIndex: number;
  total: number;
  currentFileName: string;
  stageLabel: string;
}
