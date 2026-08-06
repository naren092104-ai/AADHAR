"use client";

import { FileArchive, FileImage, FileText, Loader2, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { ExportVariant, ProcessedFile } from "@/types";
import { downloadBlob, exportBatchZip, exportFile } from "@/services/export";
import { formatBytes } from "@/utils/canvas";

interface Props {
  file: ProcessedFile | null;
  files: ProcessedFile[];
  compression: boolean;
  onPatch: (id: string, patch: Partial<ProcessedFile>) => void;
}

interface ActionCard {
  key: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  disabled: boolean;
  onClick: () => void;
}

export function QuickActions({ file, files, compression, onPatch }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const readyFiles = files.filter((f) => !f.error && f.pages.length > 0);
  const readyMaskedFiles = readyFiles.filter((f) => f.masks.length > 0);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed.";
      if (target) {
        onPatch(target.id, { statuses: { ...target.statuses, download: "error" } });
      }
      toast.error("Download failed", { description: message });
    } finally {
      setBusy(null);
    }
  };

  const single = (key: string, variant: ExportVariant, format: "pdf" | "png" | "jpg") => {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Share failed.";
      toast.error("Share failed", { description: message });
    } finally {
      setBusy(null);
    }
  };

  const fileReady =
    !!file &&
    file.pages.length > 0 &&
    !file.error &&
    busy === null &&
    file.masks.length > 0;

  const actions: ActionCard[] = [
    {
      key: "pdf",
      label: "Download PDF",
      sub: "Masked document",
      icon: <FileText size={22} />,
      color: "#D95F00",
      bg: "#FFF0E6",
      border: "#FDDCBB",
      disabled: !fileReady,
      onClick: () => single("pdf", "masked", "pdf"),
    },
    {
      key: "img",
      label: "Download Images",
      sub: "Masked PNG / JPG",
      icon: <FileImage size={22} />,
      color: "#7C3AED",
      bg: "#F5F3FF",
      border: "#DDD6FE",
      disabled: !fileReady,
      onClick: () => single("img", "masked", file?.kind === "image" ? "png" : "jpg"),
    },
    {
      key: "zip",
      label: "Download ZIP",
      sub: `All ${readyFiles.length} document(s)`,
      icon: <FileArchive size={22} />,
      color: "#B45309",
      bg: "#FFFBEB",
      border: "#FDE68A",
      disabled: readyMaskedFiles.length === 0 || busy !== null,
      onClick: () =>
        void run("zip", () => exportBatchZip(readyMaskedFiles, "masked", compression)),
    },
    {
      key: "share",
      label: "Share",
      sub: "Via Web Share API",
      icon: <Share2 size={22} />,
      color: "#15803D",
      bg: "#F0FDF4",
      border: "#BBF7D0",
      disabled: !fileReady || !shareSupported,
      onClick: () => void share(),
    },
  ];

  return (
    <div className="grid-actions">
      {actions.map((action) => (
        <button
          key={action.key}
          disabled={action.disabled}
          onClick={action.onClick}
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: `1px solid ${action.disabled ? "#E5E7EB" : action.border}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -6px rgba(0,0,0,0.07)",
            padding: "20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "flex-start",
            cursor: action.disabled ? "not-allowed" : "pointer",
            opacity: action.disabled ? 0.55 : 1,
            transition: "all 0.15s ease",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            if (!action.disabled) {
              (e.currentTarget as HTMLElement).style.background = action.bg;
              (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 12px rgba(0,0,0,0.08), 0 12px 28px -8px rgba(0,0,0,0.12)";
            }
          }}
          onMouseLeave={(e) => {
            if (!action.disabled) {
              (e.currentTarget as HTMLElement).style.background = "#fff";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 1px 3px rgba(0,0,0,0.04), 0 6px 16px -6px rgba(0,0,0,0.07)";
            }
          }}
        >
          <span
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: action.disabled ? "#F3F4F6" : action.bg,
              color: action.disabled ? "#9CA3AF" : action.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {busy === action.key ? (
              <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              action.icon
            )}
          </span>
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#0F172A",
                lineHeight: 1.3,
              }}
            >
              {action.label}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#9CA3AF",
                marginTop: "2px",
              }}
            >
              {action.sub}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
