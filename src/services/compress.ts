import { canvasToBlob, createCanvas, ctxOf } from "@/utils/canvas";
import { buildPdf } from "@/services/pdf";

export const TARGET_BYTES = 1024 * 1024;

function scaleCanvas(source: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  if (factor >= 0.999) return source;
  const out = createCanvas(source.width * factor, source.height * factor);
  const ctx = ctxOf(out);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

/** Compresses a single image below the target size while keeping text readable. */
export async function compressImage(
  canvas: HTMLCanvasElement,
  mimeType: "image/jpeg" | "image/png",
  enabled: boolean,
): Promise<Blob> {
  if (mimeType === "image/png") {
    const png = await canvasToBlob(canvas, "image/png");
    if (!enabled || png.size <= TARGET_BYTES) return png;
    const imageCompression = (await import("browser-image-compression")).default;
    const file = new File([png], "page.png", { type: "image/png" });
    const compressed = await imageCompression(file, {
      maxSizeMB: TARGET_BYTES / (1024 * 1024),
      maxWidthOrHeight: Math.max(canvas.width, canvas.height),
      useWebWorker: true,
      fileType: "image/png",
      initialQuality: 0.9,
    });
    return compressed;
  }

  let best = await canvasToBlob(canvas, "image/jpeg", 0.94);
  if (!enabled) return best;
  const qualities = [0.9, 0.82, 0.74, 0.66, 0.58];
  for (const quality of qualities) {
    if (best.size <= TARGET_BYTES) return best;
    best = await canvasToBlob(canvas, "image/jpeg", quality);
  }
  const scales = [0.85, 0.72, 0.6];
  for (const scale of scales) {
    if (best.size <= TARGET_BYTES) return best;
    best = await canvasToBlob(scaleCanvas(canvas, scale), "image/jpeg", 0.7);
  }
  return best;
}

/** Builds a PDF and steps quality/resolution down until it fits the size target. */
export async function compressPdf(
  canvases: HTMLCanvasElement[],
  enabled: boolean,
): Promise<Blob> {
  let blob = await buildPdf(canvases, 0.9);
  if (!enabled) return blob;
  const steps: Array<{ quality: number; scale: number }> = [
    { quality: 0.8, scale: 1 },
    { quality: 0.7, scale: 0.9 },
    { quality: 0.62, scale: 0.78 },
    { quality: 0.55, scale: 0.66 },
  ];
  for (const step of steps) {
    if (blob.size <= TARGET_BYTES) return blob;
    blob = await buildPdf(
      canvases.map((canvas) => scaleCanvas(canvas, step.scale)),
      step.quality,
    );
  }
  return blob;
}
