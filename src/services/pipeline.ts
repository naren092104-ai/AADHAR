import type { AppSettings, ProcessedFile, MaskRect, PageAsset } from "@/types";
import { enhanceCanvas } from "@/services/enhance";
import { detectAadhaarOnCanvas } from "@/services/ocr";
import { renderPdf } from "@/services/pdf";
import { composeMaskedCanvas, previewUrl, storeCanvases } from "@/services/store";
import { fileToCanvas } from "@/utils/canvas";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

export function validateFile(file: File): string | null {
  const byExtension = /\.(pdf|png|jpe?g)$/i.test(file.name);
  if (!ACCEPTED.includes(file.type) && !byExtension) {
    return `${file.name} is not supported. Upload a PDF, JPG, JPEG or PNG file.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name} is larger than the 20 MB limit.`;
  }
  if (file.size === 0) return `${file.name} is empty or unreadable.`;
  return null;
}

export function newFileId(): string {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyFile(file: File): ProcessedFile {
  const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
  return {
    id: newFileId(),
    name: file.name,
    size: file.size,
    kind: isPdf ? "pdf" : "image",
    pageCount: 0,
    pages: [],
    masks: [],
    detected: [],
    vidIgnored: 0,
    statuses: {
      enhancement: "idle",
      ocr: "idle",
      mask: "idle",
      compression: "idle",
      download: "idle",
    },
    outputSize: null,
    error: null,
    progress: 0,
  };
}

export interface PipelineCallbacks {
  onPatch: (patch: Partial<ProcessedFile>) => void;
  onStatus?: (status: string) => void;
  signal?: AbortSignal;
}

/**
 * Renders, enhances and OCRs a single document entirely in the browser.
 * Returns the page assets plus every OCR-detected mask rectangle.
 */
export async function processFile(
  record: ProcessedFile,
  file: File,
  settings: AppSettings,
  { onPatch, onStatus, signal }: PipelineCallbacks,
): Promise<void> {
  const originals: HTMLCanvasElement[] =
    record.kind === "pdf" ? (await renderPdf(file)).canvases : [await fileToCanvas(file)];

  if (!originals.length) throw new Error("No readable pages were found in this document.");

  onPatch({ pageCount: originals.length, progress: 10 });

  const enhanced: HTMLCanvasElement[] = [];
  const pages: PageAsset[] = [];
  const masks: MaskRect[] = [];
  const detected: ProcessedFile["detected"] = [];
  let vidIgnored = 0;

  const report = (status: string) => {
    onStatus?.(status);
  };

  const checkAbort = () => {
    if (signal?.aborted) {
      report("Processing cancelled");
      throw new Error("Processing cancelled");
    }
  };

  onPatch({ statuses: { ...record.statuses, enhancement: settings.autoEnhance ? "running" : "skipped" } });

  for (let index = 0; index < originals.length; index++) {
    checkAbort();
    report(`Enhancing page ${index + 1}...`);
    const original = originals[index];
    const improved = settings.autoEnhance ? enhanceCanvas(original) : original;
    enhanced.push(improved);
    pages.push({
      index,
      width: improved.width,
      height: improved.height,
      originalUrl: previewUrl(original),
      enhancedUrl: previewUrl(improved),
    });
    onPatch({
      pages: [...pages],
      progress: 10 + Math.round(((index + 1) / originals.length) * 40),
    });
  }

  onPatch({
    statuses: {
      ...record.statuses,
      enhancement: settings.autoEnhance ? "done" : "skipped",
      ocr: settings.autoOcr ? "running" : "skipped",
    },
  });

  if (settings.autoOcr) {
    report("Running OCR...");
    for (let index = 0; index < enhanced.length; index++) {
      checkAbort();
      const result = await detectAadhaarOnCanvas(enhanced[index], index);
      for (const mask of result.masks) {
        masks.push({ ...mask, id: `${record.id}_m${masks.length}` });
      }
      detected.push(...result.detected);
      vidIgnored += result.vidIgnored ?? 0;
      onPatch({
        masks: [...masks],
        detected: [...detected],
        progress: 50 + Math.round(((index + 1) / enhanced.length) * 30),
      });
    }
  }

  storeCanvases(record.id, { original: originals, enhanced });

  if (settings.autoMask && masks.length) {
    report("Verifying masked Aadhaar...");
    let retry = 0;
    while (retry < 3) {
      checkAbort();
      let newMasks = 0;
      for (let index = 0; index < enhanced.length; index++) {
        const pageMasks = masks.filter((mask) => mask.page === index);
        const verifyCanvas = composeMaskedCanvas(enhanced[index], pageMasks);
        const result = await detectAadhaarOnCanvas(verifyCanvas, index);
        for (const mask of result.masks) {
          const alreadyExists = masks.some((existing) =>
            existing.page === mask.page &&
            Math.abs(existing.x - mask.x) < 0.01 &&
            Math.abs(existing.y - mask.y) < 0.01 &&
            Math.abs(existing.w - mask.w) < 0.01 &&
            Math.abs(existing.h - mask.h) < 0.01,
          );
          if (alreadyExists) continue;
          masks.push({ ...mask, id: `${record.id}_m${masks.length}` });
          detected.push({
            page: mask.page,
            value: mask.digits ?? "unverified",
            confidence: mask.confidence ?? 0,
          });
          newMasks += 1;
        }
      }
      onPatch({ masks: [...masks], detected: [...detected] });
      if (!newMasks) break;
      retry += 1;
      report(`Rechecking masked Aadhaar pass ${retry + 1}...`);
    }
  }

  onPatch({
    pages,
    masks: settings.autoMask ? masks : [],
    detected,
    vidIgnored,
    progress: 100,
    statuses: {
      enhancement: settings.autoEnhance ? "done" : "skipped",
      ocr: settings.autoOcr ? "done" : "skipped",
      mask: settings.autoMask && masks.length ? "done" : settings.autoMask ? "idle" : "skipped",
      compression: "idle",
      download: "idle",
    },
  });
}
