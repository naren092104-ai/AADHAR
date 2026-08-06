import { createCanvas, ctxOf } from "@/utils/canvas";

const RENDER_SCALE = 2;

export interface RenderedPdf {
  canvases: HTMLCanvasElement[];
}

/** Renders every page of a PDF to a canvas at ~192 DPI. */
export async function renderPdf(file: File): Promise<RenderedPdf> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  } catch (error) {
    const name = (error as { name?: string }).name;
    if (name === "PasswordException") {
      throw new Error("This PDF is password protected. Remove the password and try again.");
    }
    throw new Error("This PDF appears to be corrupted and could not be opened.");
  }

  const canvases: HTMLCanvasElement[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = ctxOf(canvas);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    canvases.push(canvas);
    page.cleanup();
  }
  await doc.cleanup();
  return { canvases };
}

/** Builds a PDF from page canvases, preserving each page's aspect ratio. */
export async function buildPdf(
  canvases: HTMLCanvasElement[],
  quality: number,
): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  for (const canvas of canvases) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const image = await pdf.embedJpg(dataUrl);
    const ratio = 72 / 192;
    const width = canvas.width * ratio;
    const height = canvas.height * ratio;
    const page = pdf.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }
  const bytes = await pdf.save();
  return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
}
