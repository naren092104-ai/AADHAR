import type { MaskRect, DetectedAadhaar } from "@/types";
import { createCanvas, ctxOf } from "@/utils/canvas";
import { looksLikeAadhaar, verhoeffValid } from "@/utils/aadhaar";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface OcrWord {
  text: string;
  bbox: BBox;
  confidence: number;
}

interface OcrLine {
  words: OcrWord[];
  bbox: BBox;
}

type TesseractWorker = {
  recognize: (
    image: HTMLCanvasElement,
    options?: unknown,
    output?: unknown,
  ) => Promise<{ data: unknown }>;
  terminate: () => Promise<unknown>;
};

// ── Worker ────────────────────────────────────────────────────────────────────

let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        preserve_interword_spaces: "1",
        // Use the default page segmentation mode for best line/word grouping.
      });
      return worker as unknown as TesseractWorker;
    })();
  }
  return workerPromise;
}

export async function releaseOcr(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise.catch(() => null);
  workerPromise = null;
  if (worker) await worker.terminate().catch(() => undefined);
}

// ── OCR data collection ───────────────────────────────────────────────────────

function lineBboxFromWords(words: OcrWord[]): BBox {
  return {
    x0: Math.min(...words.map((w) => w.bbox.x0)),
    y0: Math.min(...words.map((w) => w.bbox.y0)),
    x1: Math.max(...words.map((w) => w.bbox.x1)),
    y1: Math.max(...words.map((w) => w.bbox.y1)),
  };
}

function collectLines(data: unknown): OcrLine[] {
  const lines: OcrLine[] = [];
  const root = data as {
    blocks?: unknown[];
    lines?: unknown[];
    words?: OcrWord[];
  };

  const pushLine = (line: unknown) => {
    const words = (line as { words?: OcrWord[] }).words ?? [];
    if (words.length) {
      lines.push({ words, bbox: lineBboxFromWords(words) });
    }
  };

  if (Array.isArray(root.blocks)) {
    for (const block of root.blocks) {
      const paragraphs = (block as { paragraphs?: unknown[] }).paragraphs ?? [];
      for (const paragraph of paragraphs) {
        const paraLines = (paragraph as { lines?: unknown[] }).lines ?? [];
        for (const line of paraLines) pushLine(line);
      }
    }
  }
  if (!lines.length && Array.isArray(root.lines)) {
    for (const line of root.lines) pushLine(line);
  }
  if (!lines.length && Array.isArray(root.words) && root.words.length) {
    lines.push({
      words: root.words as OcrWord[],
      bbox: lineBboxFromWords(root.words as OcrWord[]),
    });
  }
  return lines;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function digitsOf(text: string): string {
  return text.replace(/\D/g, "");
}

/** A token is "numeric" if it's entirely digits (with optional separators). */
function isNumericToken(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && /^[\d][0-9\-. ]*$/.test(t) && digitsOf(t).length > 0;
}

/** Separator-only tokens between numeric groups */
function isSeparator(text: string): boolean {
  return /^[:\-—./\s]+$/.test(text.trim());
}

// VID / Virtual ID lines — skip entirely
const VID_PATTERNS: RegExp[] = [
  /\bVID\b/i,
  /\bV\s*I\s*D\b/i,
  /\bVIRTUAL\s+ID\b/i,
  /\bVOTER\s*ID\b/i,
];
function isVidLine(text: string): boolean {
  return VID_PATTERNS.some((p) => p.test(text));
}

// ── Numeric run collector ─────────────────────────────────────────────────────

/**
 * Starting from (lineIdx, wordIdx), collect consecutive numeric (or separator)
 * word tokens until we have EXACTLY 12 digits or hit a real non-numeric word.
 *
 * We stop as soon as digits >= 12 — never accumulate more.
 * This prevents phone numbers or pincodes from being accidentally merged
 * with a later number to hit 12 digits.
 */
function collectNumericRun(
  lines: OcrLine[],
  startLine: number,
  startWord: number,
): OcrWord[] {
  const collected: OcrWord[] = [];
  let digits = 0;

  for (let li = startLine; li < Math.min(lines.length, startLine + 4); li++) {
    const startW = li === startLine ? startWord : 0;

    // When crossing to next line, check vertical proximity
    if (li > startLine && collected.length > 0) {
      const lastToken = collected[collected.length - 1];
      const lineHeight = lastToken.bbox.y1 - lastToken.bbox.y0;
      const gap = lines[li].bbox.y0 - lastToken.bbox.y1;
      // If the next line is more than 1.2 line-heights away, stop
      if (gap > lineHeight * 1.2) break;
    }

    for (let wi = startW; wi < lines[li].words.length; wi++) {
      const w = lines[li].words[wi];
      const t = w.text.trim();
      if (!t) continue;

      if (isNumericToken(t)) {
        const td = digitsOf(t).length;
        // If adding this token would exceed 12, stop — don't over-collect
        if (digits + td > 12) return collected;
        collected.push(w);
        digits += td;
        if (digits === 12) return collected; // exactly 12, done
        continue;
      }

      // Allow separators between numbers only if we haven't started yet or are mid-run
      if (isSeparator(t) && collected.length > 0) continue;

      // Any real word after we started collecting = stop
      if (collected.length > 0) return collected;

      // Any real label word before we started — skip only on the START line
      if (li === startLine) continue;

      // On a continuation line, any non-numeric = stop
      return collected;
    }
  }

  return collected;
}

/**
 * Validate that the first 12 digits of the run form a valid Aadhaar number.
 *
 * Strict guards:
 * - Total digits collected must be EXACTLY 12 (no more, no less).
 *   If a run has only 8 digits (phone) or 6 (pincode) it can never be Aadhaar.
 *   If a run has 13+ digits it means we accidentally joined unrelated numbers.
 * - looksLikeAadhaar: must not start with 0 or 1, no all-same digits.
 * - verhoeffValid: UIDAI checksum.
 * - Each individual token must have 4 digits exactly (Aadhaar is always
 *   printed as XXXX XXXX XXXX — three 4-digit groups). We allow 1 merged
 *   token of 8 or 12 digits as a fallback, but never 6, 5, 7, 9, 10, 11.
 */
function validateRun(tokens: OcrWord[]): string | null {
  const allDigits = tokens.map((t) => digitsOf(t.text)).join("");

  // Must be exactly 12 digits — not 8 (phone), not 6 (pincode), not 10 (mobile)
  if (allDigits.length !== 12) return null;

  // Each token should have 4 digits (XXXX XXXX XXXX) — or one merged 8/12 digit token
  for (const t of tokens) {
    const d = digitsOf(t.text).length;
    // Allowed token digit counts: 4, 8, 12 (merged groups)
    if (d !== 4 && d !== 8 && d !== 12) return null;
  }

  if (!looksLikeAadhaar(allDigits)) return null;
  if (!verhoeffValid(allDigits)) return null;
  return allDigits;
}

// ── Mask builder ──────────────────────────────────────────────────────────────

/**
 * Build one precise mask rect per numeric token for the first 8 digits.
 * The last 4 digits (and all other content) are untouched.
 *
 * - One rect per word = no large merged rectangles.
 * - When a single token straddles the 8-digit boundary, clip proportionally.
 * - Minimal padding: 4% height vertical, 1px horizontal.
 */
function buildPreciseMasks(
  tokens: OcrWord[],
  page: number,
  canvasWidth: number,
  canvasHeight: number,
): Omit<MaskRect, "id">[] {
  const masks: Omit<MaskRect, "id">[] = [];
  let covered = 0;

  for (const token of tokens) {
    if (covered >= 8) break;

    const td = digitsOf(token.text);
    if (!td.length) continue;

    const { x0, y0, x1, y1 } = token.bbox;
    const h = y1 - y0;
    const padY = h * 0.04;            // 4% of char height
    const padX = 1 / canvasWidth;     // 1px

    const need = 8 - covered;
    let rectX1: number;
    if (td.length <= need) {
      rectX1 = x1;
      covered += td.length;
    } else {
      rectX1 = x0 + (x1 - x0) * (need / td.length);
      covered = 8;
    }

    const nx = Math.max(0, (x0 - padX) / canvasWidth);
    const ny = Math.max(0, (y0 - padY) / canvasHeight);
    const nw = Math.min(1 - nx, (rectX1 - x0 + padX * 2) / canvasWidth);
    const nh = Math.min(1 - ny, (h + padY * 2) / canvasHeight);

    if (nw > 0.001 && nh > 0.001) {
      masks.push({ page, x: nx, y: ny, w: nw, h: nh, source: "ocr" });
    }
  }

  return masks;
}

// ── Canvas scaler ─────────────────────────────────────────────────────────────

/**
 * Scale canvas to ~2400px long side for better Tesseract bbox accuracy.
 * Returns both the scaled canvas and the scale factor so we can map
 * OCR bboxes back to original canvas coordinates.
 */
function prepareOcrCanvas(source: HTMLCanvasElement): {
  canvas: HTMLCanvasElement;
  scale: number;
} {
  const TARGET = 2400;
  const longest = Math.max(source.width, source.height, 1);
  const scale = Math.min(2.5, TARGET / longest);
  if (Math.abs(scale - 1) < 0.02) return { canvas: source, scale: 1 };

  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const canvas = createCanvas(w, h);
  const ctx = ctxOf(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return { canvas, scale };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface OcrPageResult {
  masks: Omit<MaskRect, "id">[];
  detected: DetectedAadhaar[];
  vidIgnored: number;
}

export async function detectAadhaarOnCanvas(
  canvas: HTMLCanvasElement,
  page: number,
): Promise<OcrPageResult> {
  const worker = await getWorker();
  const { canvas: ocrCanvas, scale } = prepareOcrCanvas(canvas);

  const { data } = await worker.recognize(ocrCanvas, {}, { blocks: true, text: true });
  const lines = collectLines(data);

  const masks: Omit<MaskRect, "id">[] = [];
  const detected: DetectedAadhaar[] = [];
  const seenKeys = new Set<string>(); // deduplicate by digits + approx Y position
  let vidIgnored = 0;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const lineText = line.words.map((w) => w.text).join(" ");

    // Skip VID lines entirely
    if (isVidLine(lineText)) {
      vidIgnored += line.words.filter((w) => isNumericToken(w.text)).length;
      continue;
    }

    for (let wi = 0; wi < line.words.length; wi++) {
      const word = line.words[wi];

      // Only start a run from a numeric token
      if (!isNumericToken(word.text)) continue;

      const run = collectNumericRun(lines, li, wi);
      if (!run.length) continue;

      const aadhaarDigits = validateRun(run);
      if (!aadhaarDigits) {
        // Not a valid Aadhaar — skip but don't advance wi,
        // a later starting position might still work
        continue;
      }

      // De-duplicate: same number at roughly same vertical position
      const midY = Math.round(
        run.reduce((s, t) => s + (t.bbox.y0 + t.bbox.y1) / 2, 0) / run.length / 8,
      ) * 8;
      const key = `${aadhaarDigits}@${midY}`;
      if (seenKeys.has(key)) {
        wi += run.length - 1;
        continue;
      }
      seenKeys.add(key);

      // Map OCR canvas bboxes → original canvas coords (divide by scale)
      const originalRun = run.map((t) => ({
        ...t,
        bbox: {
          x0: t.bbox.x0 / scale,
          y0: t.bbox.y0 / scale,
          x1: t.bbox.x1 / scale,
          y1: t.bbox.y1 / scale,
        },
      }));

      const newMasks = buildPreciseMasks(
        originalRun,
        page,
        canvas.width,
        canvas.height,
      );
      masks.push(...newMasks);

      const avgConf =
        run.reduce((s, t) => s + (t.confidence ?? 80), 0) / run.length / 100;

      detected.push({
        page,
        value: aadhaarDigits,
        confidence: Math.max(avgConf, 0.9),
      });

      wi += run.length - 1;
    }
  }

  return { masks, detected, vidIgnored };
}
