"use client";

import { useMemo, useState } from "react";
import { Download, FileArchive, FileImage, FileText, Loader2, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type { ExportVariant, ProcessedFile } from "@/types";
import { Button } from "@/components/ui/button";
import { downloadBlob, exportBatchZip, exportFile } from "@/services/export";
import { formatBytes } from "@/utils/canvas";

interface Props {
  file: ProcessedFile | null;
  files: ProcessedFile[];
  compression: boolean;
  onPatch: (id: string, patch: Partial<ProcessedFile>) => void;
}

export function DownloadPanel({ file, files, compression, onPatch }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const readyFiles = files.filter((item) => !item.error && item.pages.length > 0);
  const readyMaskedFiles = readyFiles.filter((item) => item.masks.length > 0);
  const shareSupported = useMemo(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    [],
  );

  const run = async (
    key: string,
    action: () => Promise<{ blob: Blob; filename: string }>,
    target?: ProcessedFile,
  ) => {
    setBusy(key);
    if (target) {
      onPatch(target.id, {
        statuses: { ...target.statuses, compression: compression ? "running" : "skipped" },
      });
    }
    try {
      const result = await action();
      downloadBlob(result.blob, result.filename);
      if (target) {
        onPatch(target.id, {
          outputSize: result.blob.size,
          statuses: {
            ...target.statuses,
            compression: compression ? "done" : "skipped",
            download: "done",
          },
        });
      }
      toast.success("Download ready", {
        description: `${result.filename} · ${formatBytes(result.blob.size)}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      if (target) {
        onPatch(target.id, { statuses: { ...target.statuses, download: "error" } });
      }
      toast.error("Download failed", { description: message });
    } finally {
      setBusy(null);
    }
  };

  const single = (
    key: string,
    variant: ExportVariant,
    format: "pdf" | "png" | "jpg",
  ) => {
    if (!file) return;
    void run(key, () => exportFile(file, variant, format, compression), file);
  };

  const share = async () => {
    if (!file) return;
    if (!shareSupported) {
      toast.error("Share unavailable", { description: "Your browser does not support sharing files." });
      return;
    }
    setBusy("share");
    try {
      const result = await exportFile(file, "masked", file.kind === "pdf" ? "pdf" : "jpg", compression);
      const shareFile = new File([result.blob], result.filename, { type: result.blob.type });
      if (navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({
          files: [shareFile],
          title: "Secure Aadhaar Masked Document",
          text: "Masked Aadhaar document exported from Aadhaar Mask Pro.",
        });
        toast.success("Share sheet opened");
      } else {
        toast.error("Share not supported for this file type.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Share failed.";
      toast.error("Share failed", { description: message });
    } finally {
      setBusy(null);
    }
  };

  const disabled =
    !file ||
    file.pages.length === 0 ||
    Boolean(file.error) ||
    busy !== null ||
    file.masks.length === 0;

  const zipDisabled = readyMaskedFiles.length === 0 || busy !== null;
  const shareDisabled =
    !file ||
    file.pages.length === 0 ||
    Boolean(file.error) ||
    busy !== null ||
    file.masks.length === 0;

  return (
    <section aria-labelledby="download-heading" className="surface-card p-5">
      <h2 id="download-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Download
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {compression
          ? "Outputs are optimised towards 1 MB while keeping text readable."
          : "Compression is off — files export at full quality."}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button className="min-h-11 justify-start" disabled={disabled} onClick={() => single("pdf", "masked", "pdf")}>
          {busy === "pdf" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileText aria-hidden="true" />}
          Download Aadhaar masked PDF
        </Button>
        <Button
          variant="secondary"
          className="min-h-11 justify-start"
          disabled={disabled}
          onClick={() => single("img", "masked", file?.kind === "image" ? "png" : "jpg")}
        >
          {busy === "img" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileImage aria-hidden="true" />}
          Download Aadhaar masked image
        </Button>
      </div>

      <Button
        variant="secondary"
        className="mt-3 min-h-11 w-full justify-start"
        disabled={zipDisabled}
        onClick={() =>
          void run("zip", () => exportBatchZip(readyMaskedFiles, "masked", compression))
        }
      >
        {busy === "zip" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileArchive aria-hidden="true" />}
        Download all as ZIP ({readyMaskedFiles.length})
      </Button>
      <Button
        variant="secondary"
        className="mt-3 min-h-11 w-full justify-start"
        disabled={shareDisabled || !shareSupported}
        onClick={share}
      >
        {busy === "share" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Share2 aria-hidden="true" />}
        Share masked file
      </Button>    </section>
  );
}
