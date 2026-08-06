"use client";

import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  MinusCircle,
  Trash2,
  XCircle,
} from "lucide-react";

import type { ProcessedFile, StageStatus } from "@/types";
import { formatBytes } from "@/utils/canvas";

interface Props {
  files: ProcessedFile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

function StageChip({ status, label }: { status: StageStatus; label: string }) {
  let color = "#9CA3AF";
  let bg = "#F3F4F6";
  let icon = <CircleDashed size={12} />;

  if (status === "done") {
    color = "#15803D";
    bg = "#DCFCE7";
    icon = <CheckCircle2 size={12} />;
  } else if (status === "running") {
    color = "#D95F00";
    bg = "#FFF0E6";
    icon = <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />;
  } else if (status === "error") {
    color = "#DC2626";
    bg = "#FEE2E2";
    icon = <XCircle size={12} />;
  } else if (status === "skipped") {
    color = "#9CA3AF";
    bg = "#F3F4F6";
    icon = <MinusCircle size={12} />;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "20px",
        background: bg,
        color,
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.01em",
      }}
    >
      {icon}
      {label}
    </span>
  );
}

const STAGES: Array<{ key: keyof ProcessedFile["statuses"]; label: string }> = [
  { key: "enhancement", label: "Enhance" },
  { key: "ocr", label: "OCR" },
  { key: "mask", label: "Mask" },
  { key: "compression", label: "Compress" },
  { key: "download", label: "Export" },
];

export function ProcessingSummary({ files, activeId, onSelect, onRemove }: Props) {
  if (!files.length) return null;

  const allDone = files.every((f) => f.progress === 100 || f.error);
  const hasErrors = files.some((f) => f.error);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 24px",
          borderBottom: "1px solid #F3F4F6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: allDone && !hasErrors ? "#DCFCE7" : "#FFF0E6",
              color: allDone && !hasErrors ? "#15803D" : "#D95F00",
            }}
          >
            {allDone && !hasErrors ? (
              <CheckCircle2 size={16} />
            ) : (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            )}
          </span>
          <div>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#0F172A",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Processing Summary
            </h2>
            <p style={{ fontSize: "12px", color: "#64748B", margin: "2px 0 0 0" }}>
              {files.length} document{files.length !== 1 ? "s" : ""} ·{" "}
              {allDone && !hasErrors
                ? "All complete"
                : hasErrors
                  ? "Some failed"
                  : "In progress…"}
            </p>
          </div>
        </div>

        {allDone && !hasErrors && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "8px",
              background: "#DCFCE7",
              color: "#15803D",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={13} />
            Success
          </div>
        )}
      </div>

      {/* File list */}
      <ul style={{ listStyle: "none", margin: 0, padding: "8px 0" }}>
        {files.map((file, i) => (
          <li
            key={file.id}
            style={{
              borderTop: i > 0 ? "1px solid #F9FAFB" : "none",
            }}
          >
            <div
              style={{
                padding: "16px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                background: file.id === activeId ? "#F8FAFF" : "transparent",
                transition: "background 0.15s",
              }}
            >
              {/* Row 1: Name + badge + remove */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(file.id)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#0F172A",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </p>
                  <p style={{ fontSize: "11px", color: "#64748B", margin: "3px 0 0 0" }}>
                    {formatBytes(file.size)}
                    {file.pageCount ? ` · ${file.pageCount} page${file.pageCount !== 1 ? "s" : ""}` : ""}
                    {file.detected.length > 0 ? ` · ${file.detected.length} Aadhaar` : ""}
                    {file.outputSize ? ` · output ${formatBytes(file.outputSize)}` : ""}
                  </p>
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: file.error
                        ? "#FEE2E2"
                        : file.progress === 100
                          ? "#DCFCE7"
                          : "#DBEAFE",
                      color: file.error ? "#DC2626" : file.progress === 100 ? "#15803D" : "#0B5ED7",
                    }}
                  >
                    {file.error ? "Failed" : file.progress === 100 ? "Ready" : "Processing"}
                  </span>

                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => onRemove(file.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      border: "1px solid #F3F4F6",
                      background: "#fff",
                      cursor: "pointer",
                      color: "#9CA3AF",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "#FEE2E2";
                      (e.currentTarget as HTMLElement).style.color = "#DC2626";
                      (e.currentTarget as HTMLElement).style.borderColor = "#FECACA";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "#fff";
                      (e.currentTarget as HTMLElement).style.color = "#9CA3AF";
                      (e.currentTarget as HTMLElement).style.borderColor = "#F3F4F6";
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {file.progress < 100 && !file.error && (
                <div
                  style={{
                    height: "4px",
                    background: "#F3F4F6",
                    borderRadius: "99px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${file.progress}%`,
                      background: "#0B5ED7",
                      borderRadius: "99px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              )}

              {file.error ? (
                <p style={{ fontSize: "12px", color: "#DC2626", margin: 0, fontWeight: 500 }}>
                  {file.error}
                </p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {STAGES.map((stage) => (
                    <StageChip
                      key={stage.key}
                      status={file.statuses[stage.key]}
                      label={stage.label}
                    />
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
