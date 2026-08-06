import type { MaskRect } from "@/types";
import { cloneCanvas, createCanvas, ctxOf } from "@/utils/canvas";

interface CanvasBundle {
  original: HTMLCanvasElement[];
  enhanced: HTMLCanvasElement[];
}

const registry = new Map<string, CanvasBundle>();

export function storeCanvases(fileId: string, bundle: CanvasBundle): void {
  registry.set(fileId, bundle);
}

export function getBundle(fileId: string): CanvasBundle | undefined {
  return registry.get(fileId);
}

/** Wipes decoded page pixels from memory once the user is done with a file. */
export function purgeCanvases(fileId: string): void {
  const bundle = registry.get(fileId);
  if (!bundle) return;
  for (const canvas of [...bundle.original, ...bundle.enhanced]) {
    canvas.width = 0;
    canvas.height = 0;
  }
  registry.delete(fileId);
}

export function purgeAll(): void {
  for (const id of Array.from(registry.keys())) purgeCanvases(id);
}

/** Draws solid black rectangles over the masked digits of a page. */
export function composeMaskedCanvas(
  base: HTMLCanvasElement,
  masks: MaskRect[],
): HTMLCanvasElement {
  const out = cloneCanvas(base);
  const ctx = ctxOf(out);
  ctx.fillStyle = "#000000";
  for (const mask of masks) {
    ctx.fillRect(mask.x * out.width, mask.y * out.height, mask.w * out.width, mask.h * out.height);
  }
  return out;
}

/** Creates a downscaled preview data URL so the UI never holds full-size bitmaps. */
export function previewUrl(canvas: HTMLCanvasElement, maxSize = 1400): string {
  const factor = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
  if (factor >= 0.999) return canvas.toDataURL("image/jpeg", 0.85);
  const small = createCanvas(canvas.width * factor, canvas.height * factor);
  const ctx = ctxOf(small);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, small.width, small.height);
  return small.toDataURL("image/jpeg", 0.85);
}
