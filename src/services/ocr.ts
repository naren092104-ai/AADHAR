import type { MaskRect, DetectedAadhaar } from "@/types";
import { createCanvas, ctxOf } from "@/utils/canvas";
import { looksLikeAadhaar, verhoeffValid } from "@/utils/aadhaar";

interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

interface OcrLine {
  words: OcrWord[];
}

type TesseractWorker = {
  recognize: (
    image: HTMLCanvasElement,
    options?: unknown,
    output?: unknown,
  ) => Promise<{ data: unknown }>;
  terminate: () => Promise<unknown>;
};

let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist:
          "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz /-.:,",
        preserve_interword_spaces: "1",
      });
      return worker as unknown as TesseractWorker;
    })();
  }
  return workerPromise;
}

/** Frees the OCR worker and its WASM memory once processing is finished. */
export async function releaseOcr(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise.catch(() => null);
  workerPromise = null;
  if (worker) await worker.terminate().catch(() => undefined);
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
    if (words.length) lines.push({ words });
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
    lines.push({ words: root.words });
  }
  return lines;
}

function digitsOf(text: string): string {
  return text.replace(/\D/g, "");
}

function normalizeLabelToken(text: string) {
  return text.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function isVidLabelToken(text: string): boolean {
  const normalized = normalizeLabelToken(text);
  return /^(V|VI|VID|VIDNO|VIDNUMBER|VIRTUAL|VIRTUALID|VIRTUALIDNO|VIRTUALIDNUMBER|VOTER|VOTERID|VOTERIDNO|VOTERIDNUMBER)$/i.test(normalized);
}

function indexOfVidLabel(words: OcrWord[]): number {
  return words.findIndex((word) => isVidLabelToken(word.text));
}

function lineContainsVidLabel(text: string): boolean {
  return /\bV\s*I\s*D\b|\bVID\b|\bVID\s*[:\-]?\s*No\b|\bVIRTUAL\s*ID\b|\bVIRTUAL\s*ID\s*No\b|\bVOTER\s*ID\b|\bVOTERID\b|\bVOTER\s*ID\s*No\b/i.test(text);
}

function lineContainsAadhaarLabel(text: string): boolean {
  return /\b(AADHAAR|AADHAR|YOUR\s+AADHAAR|YOUR\s+AADHAR|AADHAAR\s+NO|AADHAR\s+NO|AADHAAR\s+NUMBER|AADHAR\s+NUMBER|UIDAI|UIDAI\s+AADHAAR|UNIQUE\s+IDENTIFICATION\s+AUTHORITY\s+OF\s+INDIA|UNIQUE\s+IDENTITY\s+AUTHORITY\s+OF\s+INDIA)\b/i.test(text) || /आधार|ஆதார்/i.test(text);
}

function lineContainsNoMaskLabel(text: string): boolean {
  return /\b(QR|QR\s+CODE|PHOTO|NAME|ADDRESS|GENDER|DOB|DATE\s+OF\s+BIRTH|PHONE|MOBILE|MOBILE\s+NUMBER|ACCOUNT|PAN|PASSPORT|DRIVING\s+LICEN[CS]E|IFSC|PIN\s*CODE|PINCODE|PIN)\b/i.test(text);
}

function countNumericTokens(words: OcrWord[]): number {
  return words.filter((word) => isNumericToken(word.text)).length;
}

function filterVidTokens(words: OcrWord[]): { filtered: OcrWord[]; vidIgnored: number } {
  const vidLabelIndex = indexOfVidLabel(words);
  if (vidLabelIndex !== -1) {
    const filtered = words.slice(0, vidLabelIndex);
    const vidIgnored = words.slice(vidLabelIndex + 1).filter((word) => isNumericToken(word.text)).length;
    return { filtered, vidIgnored };
  }

  if (lineContainsVidLabel(words.map((word) => word.text).join(" "))) {
    return {
      filtered: [],
      vidIgnored: countNumericTokens(words),
    };
  }

  return { filtered: words, vidIgnored: 0 };
}

function isNumericToken(text: string): boolean {
  const cleaned = text.trim();
  if (!cleaned) return false;
  return /^[0-9][0-9\-. ]*$/.test(cleaned) && digitsOf(cleaned).length > 0;
}

function prepareOcrCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  if (scale >= 0.999) return source;
  const canvas = createCanvas(Math.round(source.width * scale), Math.round(source.height * scale));
  const ctx = ctxOf(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

interface LineMatch {
  digits: string;
  confidence: number;
  rect: { x0: number; y0: number; x1: number; y1: number };
}

/** Finds Aadhaar numbers inside a line and returns the box over the first 8 digits. */
function matchLine(words: OcrWord[]): LineMatch[] {
  const matches: LineMatch[] = [];
  const tokens = words.filter((word) => isNumericToken(word.text));
  const lineText = words.map((word) => word.text).join(" ");
  const isLikelyAadhaarLine = lineContainsAadhaarLabel(lineText);
  const isNonMaskLine = lineContainsNoMaskLabel(lineText);
  let i = 0;
  while (i < tokens.length) {
    let digits = "";
    let end = i;
    while (end < tokens.length && digits.length < 12) {
      digits += digitsOf(tokens[end].text);
      end++;
      if (digits.length >= 12) break;
    }
    if (digits.length !== 12 || !looksLikeAadhaar(digits) || !verhoeffValid(digits)) {
      i++;
      continue;
    }

    const isVidContext = lineContainsVidLabel(lineText);
    if (isVidContext && !isLikelyAadhaarLine) {
      i = end;
      continue;
    }

    if (isNonMaskLine && !isLikelyAadhaarLine) {
      i = end;
      continue;
    }

    const used = tokens.slice(i, end);
    let consumed = 0;
    let maskEndX = used[0].bbox.x1;
    for (const token of used) {
      const tokenDigits = digitsOf(token.text).length;
      if (consumed + tokenDigits <= 8) {
        consumed += tokenDigits;
        maskEndX = token.bbox.x1;
        if (consumed === 8) break;
      } else {
        const need = 8 - consumed;
        const ratio = need / tokenDigits;
        maskEndX = token.bbox.x0 + (token.bbox.x1 - token.bbox.x0) * ratio;
        consumed = 8;
        break;
      }
    }
    const x0 = Math.min(...used.map((t) => t.bbox.x0));
    const x1 = Math.max(...used.map((t) => t.bbox.x1));
    const y0 = Math.min(...used.map((t) => t.bbox.y0));
    const y1 = Math.max(...used.map((t) => t.bbox.y1));
    const padX = (y1 - y0) * 0.15;
    const padY = (y1 - y0) * 0.18;
    const maskedX1 = Math.max(maskEndX, x0);
    matches.push({
      digits,
      confidence:
        used.reduce((sum, t) => sum + (t.confidence ?? 0), 0) / used.length / 100,
      rect: {
        x0: x0 - padX,
        y0: y0 - padY,
        x1: maskedX1 + padX,
        y1: y1 + padY,
      },
    });
    i = end;
  }
  return matches;
}

export interface OcrPageResult {
  masks: Omit<MaskRect, "id">[];
  detected: DetectedAadhaar[];
  vidIgnored: number;
}

/** Runs OCR on one rendered page and returns normalized mask rectangles. */
export async function detectAadhaarOnCanvas(
  canvas: HTMLCanvasElement,
  page: number,
): Promise<OcrPageResult> {
  const worker = await getWorker();
  const ocrCanvas = prepareOcrCanvas(canvas);
  const { data } = await worker.recognize(ocrCanvas, {}, { blocks: true, text: true });
  const lines = collectLines(data);
  const masks: Omit<MaskRect, "id">[] = [];
  const detected: DetectedAadhaar[] = [];
  const seen = new Set<string>();
  let vidIgnored = 0;

  for (const line of lines) {
    const { filtered, vidIgnored: ignored } = filterVidTokens(line.words);
    if (ignored) vidIgnored += ignored;

    const matches = matchLine(filtered);
    for (const match of matches) {
      const key = `${page}-${match.digits}-${Math.round(match.rect.y0)}-${Math.round(match.rect.x0)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const x0 = Math.max(0, Math.min(ocrCanvas.width, match.rect.x0));
      const y0 = Math.max(0, Math.min(ocrCanvas.height, match.rect.y0));
      const x1 = Math.max(0, Math.min(ocrCanvas.width, match.rect.x1));
      const y1 = Math.max(0, Math.min(ocrCanvas.height, match.rect.y1));
      masks.push({
        page,
        x: x0 / ocrCanvas.width,
        y: y0 / ocrCanvas.height,
        w: Math.min(1, Math.max(0.02, (x1 - x0) / ocrCanvas.width)),
        h: Math.min(1, Math.max(0.02, (y1 - y0) / ocrCanvas.height)),
        source: "ocr",
      });
      detected.push({
        page,
        value: match.digits,
        confidence: Math.max(match.confidence, 0.95),
      });
    }
  }
  return { masks, detected, vidIgnored };
}
