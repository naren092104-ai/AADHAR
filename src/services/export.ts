import type { ExportVariant, ProcessedFile } from "@/types";
import { compressImage, compressPdf } from "@/services/compress";
import { composeMaskedCanvas, getBundle } from "@/services/store";

export interface ExportResult {
  blob: Blob;
  filename: string;
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function pagesFor(file: ProcessedFile, variant: ExportVariant): HTMLCanvasElement[] {
  const bundle = getBundle(file.id);
  if (!bundle) throw new Error("Document data is no longer in memory. Re-upload the file.");
  return bundle.enhanced.map((canvas, index) =>
    variant === "masked"
      ? composeMaskedCanvas(
          canvas,
          file.masks.filter((mask) => mask.page === index),
        )
      : canvas,
  );
}

/** Produces the downloadable artefact for a processed file. */
export async function exportFile(
  file: ProcessedFile,
  variant: ExportVariant,
  format: "pdf" | "png" | "jpg",
  compress: boolean,
): Promise<ExportResult> {
  const canvases = pagesFor(file, variant);
  const suffix = variant === "masked" ? "masked" : "enhanced";

  if (format === "pdf") {
    const blob = await compressPdf(canvases, compress);
    return { blob, filename: `${baseName(file.name)}-${suffix}.pdf` };
  }

  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  if (canvases.length === 1) {
    const blob = await compressImage(canvases[0], mimeType, compress);
    return { blob, filename: `${baseName(file.name)}-${suffix}.${format}` };
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (let index = 0; index < canvases.length; index++) {
    const blob = await compressImage(canvases[index], mimeType, compress);
    zip.file(`${baseName(file.name)}-${suffix}-p${index + 1}.${format}`, blob);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, filename: `${baseName(file.name)}-${suffix}-images.zip` };
}

/** Bundles every processed file into a single ZIP archive. */
export async function exportBatchZip(
  files: ProcessedFile[],
  variant: ExportVariant,
  compress: boolean,
): Promise<ExportResult> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const file of files) {
    const result = await exportFile(
      file,
      variant,
      file.kind === "pdf" ? "pdf" : "jpg",
      compress,
    );
    zip.file(result.filename, result.blob);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, filename: `aadhaar-${variant}-batch.zip` };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
