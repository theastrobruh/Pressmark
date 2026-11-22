declare module 'gifenc' {
  export interface GifFrameOptions {
    transparent?: boolean;
    transparentIndex?: number;
    delay?: number;
    palette?: number[][] | null;
    repeat?: number;
    colorDepth?: number;
    dispose?: number;
    first?: boolean;
  }

  export interface GifEncoderInstance {
    reset(): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    buffer: ArrayBuffer;
    writeHeader(): void;
    writeFrame(index: Uint8Array | Uint8ClampedArray, width: number, height: number, opts?: GifFrameOptions): void;
  }

  export function GIFEncoder(opt?: { initialCapacity?: number; auto?: boolean }): GifEncoderInstance;
  export function quantize(rgba: Uint8ClampedArray | Uint8Array, maxColors: number, opts?: Record<string, unknown>): number[][];
  export function applyPalette(rgba: Uint8ClampedArray | Uint8Array, palette: number[][], format?: string): Uint8Array;
}
