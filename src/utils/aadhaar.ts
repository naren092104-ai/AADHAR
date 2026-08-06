const SEPARATORS = /[\s\-.]/g;

/** Verhoeff checksum used by UIDAI Aadhaar numbers. */
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeffValid(digits: string): boolean {
  if (!/^\d{12}$/.test(digits)) return false;
  let c = 0;
  const rev = digits.split("").reverse();
  for (let i = 0; i < rev.length; i++) {
    c = D[c][P[i % 8][Number(rev[i])]];
  }
  return c === 0;
}

export function normalizeDigits(text: string): string {
  return text.replace(SEPARATORS, "");
}

/** Aadhaar never starts with 0 or 1. */
export function looksLikeAadhaar(digits: string): boolean {
  if (!/^\d{12}$/.test(digits)) return false;
  if (digits[0] === "0" || digits[0] === "1") return false;
  if (/^(\d)\1{11}$/.test(digits)) return false;
  return true;
}

export function formatAadhaar(digits: string): string {
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
}

export function maskedDisplay(digits: string): string {
  return `XXXX XXXX ${digits.slice(8)}`;
}
