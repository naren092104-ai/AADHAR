import { createCanvas, ctxOf } from "@/utils/canvas";

/** Target render density for OCR-grade output. */
export const TARGET_DPI = 300;
const BASE_DPI = 96;
const MAX_DIMENSION = 3200;

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Grey-world white balance, keeps original colour character but removes casts. */
function whiteBalance(data: Uint8ClampedArray): void {
  let sr = 0;
  let sg = 0;
  let sb = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    sr += data[i];
    sg += data[i + 1];
    sb += data[i + 2];
  }
  const ar = sr / n;
  const ag = sg / n;
  const ab = sb / n;
  const avg = (ar + ag + ab) / 3;
  if (avg === 0) return;
  const kr = clampGain(avg / (ar || 1));
  const kg = clampGain(avg / (ag || 1));
  const kb = clampGain(avg / (ab || 1));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp255(data[i] * kr);
    data[i + 1] = clamp255(data[i + 1] * kg);
    data[i + 2] = clamp255(data[i + 2] * kb);
  }
}

function clampGain(v: number): number {
  return Math.min(1.25, Math.max(0.8, v));
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/** Auto brightness + contrast via histogram percentile stretch on luminance. */
function autoLevels(data: Uint8ClampedArray): void {
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    hist[Math.round(luminance(data[i], data[i + 1], data[i + 2]))]++;
  }
  const total = data.length / 4;
  const lowCut = total * 0.01;
  const highCut = total * 0.97;
  let acc = 0;
  let low = 0;
  let high = 255;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= lowCut) {
      low = i;
      break;
    }
  }
  acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= highCut) {
      high = i;
      break;
    }
  }
  if (high - low < 20) return;
  const scale = 255 / (high - low);
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) lut[i] = clamp255((i - low) * scale);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
}

/** Fast box blur used as the base for shadow removal and unsharp masking. */
function boxBlur(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const win = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    let sum = 0;
    const row = y * width;
    for (let x = -radius; x <= radius; x++) sum += src[row + Math.min(width - 1, Math.max(0, x))];
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum / win;
      const add = src[row + Math.min(width - 1, x + radius + 1)];
      const sub = src[row + Math.max(0, x - radius)];
      sum += add - sub;
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++)
      sum += tmp[Math.min(height - 1, Math.max(0, y)) * width + x];
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / win;
      const add = tmp[Math.min(height - 1, y + radius + 1) * width + x];
      const sub = tmp[Math.max(0, y - radius) * width + x];
      sum += add - sub;
    }
  }
  return out;
}

/**
 * Shadow removal + background cleaning: divide the image by its heavily
 * blurred illumination estimate so uneven lighting flattens out.
 */
function removeShadows(data: Uint8ClampedArray, width: number, height: number): void {
  const lum = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    lum[p] = luminance(data[i], data[i + 1], data[i + 2]);
  }
  const radius = Math.max(8, Math.round(Math.min(width, height) / 24));
  const bg = boxBlur(lum, width, height, radius);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const base = bg[p] < 1 ? 1 : bg[p];
    const gain = Math.min(3, Math.max(0.7, 255 / base));
    data[i] = clamp255(data[i] * gain);
    data[i + 1] = clamp255(data[i + 1] * gain);
    data[i + 2] = clamp255(data[i + 2] * gain);
  }
}

/** Edge-preserving noise reduction (bilateral-lite on a 3x3 neighbourhood). */
function denoise(data: Uint8ClampedArray, width: number, height: number): void {
  const copy = new Uint8ClampedArray(data);
  const threshold = 28;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4 + c;
            const value = copy[nIdx];
            if (Math.abs(value - center) <= threshold) {
              sum += value;
              count++;
            }
          }
        }
        data[idx + c] = count > 0 ? sum / count : center;
      }
    }
  }
}

/** Unsharp mask: sharpening + blur reduction + text enhancement in one pass. */
function unsharpMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
): void {
  for (let c = 0; c < 3; c++) {
    const channel = new Float32Array(width * height);
    for (let i = c, p = 0; p < channel.length; i += 4, p++) channel[p] = data[i];
    const blurred = boxBlur(channel, width, height, 1);
    for (let i = c, p = 0; p < channel.length; i += 4, p++) {
      data[i] = clamp255(channel[p] + amount * (channel[p] - blurred[p]));
    }
  }
}

/** Estimate document skew in degrees using horizontal projection variance. */
function estimateSkew(canvas: HTMLCanvasElement): number {
  const scale = Math.min(1, 700 / Math.max(canvas.width, canvas.height));
  const w = Math.max(40, Math.round(canvas.width * scale));
  const h = Math.max(40, Math.round(canvas.height * scale));
  const small = createCanvas(w, h);
  ctxOf(small).drawImage(canvas, 0, 0, w, h);
  const { data } = ctxOf(small).getImageData(0, 0, w, h);
  const ink = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    ink[p] = luminance(data[i], data[i + 1], data[i + 2]) < 140 ? 1 : 0;
  }
  let best = 0;
  let bestScore = -1;
  for (let angle = -6; angle <= 6; angle += 0.5) {
    const rad = (angle * Math.PI) / 180;
    const rows = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!ink[y * w + x]) continue;
        const ry = Math.round(y + (x - w / 2) * Math.tan(rad));
        if (ry >= 0 && ry < h) rows[ry] += 1;
      }
    }
    let mean = 0;
    for (let y = 0; y < h; y++) mean += rows[y];
    mean /= h;
    let variance = 0;
    for (let y = 0; y < h; y++) variance += (rows[y] - mean) ** 2;
    if (variance > bestScore) {
      bestScore = variance;
      best = angle;
    }
  }
  return Math.abs(best) < 0.4 ? 0 : best;
}

function rotateCanvas(source: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  if (degrees === 0) return source;
  const rad = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const w = Math.round(source.width * cos + source.height * sin);
  const h = Math.round(source.width * sin + source.height * cos);
  const out = createCanvas(w, h);
  const ctx = ctxOf(out);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return out;
}

/** Detect 90-degree misorientation from text-line projection strength. */
function needsQuarterTurn(canvas: HTMLCanvasElement): boolean {
  const score = (c: HTMLCanvasElement) => {
    const w = 240;
    const h = Math.max(40, Math.round((c.height / c.width) * 240));
    const small = createCanvas(w, h);
    ctxOf(small).drawImage(c, 0, 0, w, h);
    const { data } = ctxOf(small).getImageData(0, 0, w, h);
    const rows = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (luminance(data[i], data[i + 1], data[i + 2]) < 140) rows[y] += 1;
      }
    }
    let mean = 0;
    for (let y = 0; y < h; y++) mean += rows[y];
    mean /= h;
    let variance = 0;
    for (let y = 0; y < h; y++) variance += (rows[y] - mean) ** 2;
    return variance / h;
  };
  const upright = score(canvas);
  const turned = score(rotateCanvas(canvas, 90));
  return turned > upright * 1.35;
}

function upscaleForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  const factor = TARGET_DPI / BASE_DPI;
  const maxFactor = MAX_DIMENSION / Math.max(source.width, source.height);
  const scale = Math.max(1, Math.min(factor, maxFactor));
  if (scale <= 1.01) return source;
  const out = createCanvas(source.width * scale, source.height * scale);
  const ctx = ctxOf(out);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

/**
 * Full enhancement pipeline. Layout, aspect ratio and colours are preserved;
 * only lighting, sharpness, noise and orientation are corrected.
 */
export function enhanceCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  let working = source;
  if (needsQuarterTurn(working)) working = rotateCanvas(working, 90);
  const skew = estimateSkew(working);
  if (skew !== 0) working = rotateCanvas(working, -skew);
  working = upscaleForOcr(working);

  const canvas = createCanvas(working.width, working.height);
  const ctx = ctxOf(canvas);
  ctx.drawImage(working, 0, 0);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  whiteBalance(data);
  removeShadows(data, canvas.width, canvas.height);
  denoise(data, canvas.width, canvas.height);
  autoLevels(data);
  unsharpMask(data, canvas.width, canvas.height, 0.55);
  ctx.putImageData(image, 0, 0);
  return canvas;
}
