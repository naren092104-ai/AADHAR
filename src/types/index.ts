export type SupportedKind = "pdf" | "image";

export interface MaskRect {
  id: string;
  page: number;
  /** Normalized 0..1 coordinates relative to the page canvas */
  x: number;
  y: number;
  w: number;
  h: number;
  source: "ocr" | "manual";
  digits?: string;
  confidence?: number;
}

export interface DetectedAadhaar {
  page: number;
  value: string;
  confidence: number;
}

export interface PageAsset {
  index: number;
  width: number;
  height: number;
  originalUrl: string;
  enhancedUrl: string;
}

export type StageStatus = "idle" | "running" | "done" | "skipped" | "error";

export interface FileStatuses {
  enhancement: StageStatus;
  ocr: StageStatus;
  mask: StageStatus;
  compression: StageStatus;
  download: StageStatus;
}

export interface ProcessedFile {
  id: string;
  name: string;
  size: number;
  kind: SupportedKind;
  pageCount: number;
  pages: PageAsset[];
  masks: MaskRect[];
  detected: DetectedAadhaar[];
  vidIgnored: number;
  statuses: FileStatuses;
  outputSize: number | null;
  error: string | null;
  progress: number;
}

export interface AppSettings {
  autoEnhance: boolean;
  autoOcr: boolean;
  autoMask: boolean;
  compression: boolean;
}

export type PreviewMode = "original" | "enhanced" | "masked";
export type ExportVariant = "masked" | "enhanced";
