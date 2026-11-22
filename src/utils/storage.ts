import { BUILTIN_PRESETS } from '../constants/presets';
import {
  FormatConfig,
  ResizeConfig,
  WatermarkLayer,
  WatermarkPreset,
} from '../types/studio';

const STORAGE_KEYS = {
  PRESETS: 'pressmark_saved_presets_v1',
  LAST_PLACED: 'pressmark_last_placed_v1',
};

export interface LastPlacedState {
  layers: WatermarkLayer[];
  resize?: ResizeConfig;
  format?: FormatConfig;
  savedAt: number;
}

export function loadUserPresets(): WatermarkPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRESETS);
    if (!raw) return BUILTIN_PRESETS;
    const parsed = JSON.parse(raw) as WatermarkPreset[];
    if (!Array.isArray(parsed) || parsed.length === 0) return BUILTIN_PRESETS;
    // Merge built-in presets if any were deleted or missing, keeping user presets first
    const userCreated = parsed.filter((p) => !p.isBuiltIn);
    const builtInIds = new Set(parsed.filter((p) => p.isBuiltIn).map((p) => p.id));
    const missingBuiltIns = BUILTIN_PRESETS.filter((b) => !builtInIds.has(b.id));
    return [...userCreated, ...parsed.filter((p) => p.isBuiltIn), ...missingBuiltIns];
  } catch {
    return BUILTIN_PRESETS;
  }
}

export function saveUserPresets(presets: WatermarkPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadLastPlaced(): LastPlacedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_PLACED);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastPlacedState;
    if (!parsed || !Array.isArray(parsed.layers) || parsed.layers.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveLastPlaced(state: LastPlacedState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_PLACED, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function cloneLayers(layers: WatermarkLayer[]): WatermarkLayer[] {
  return JSON.parse(JSON.stringify(layers)) as WatermarkLayer[];
}
