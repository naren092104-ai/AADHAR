"use client";

import { useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { CloudUpload, Loader2 } from "lucide-react";

interface Props {
  onFiles: (files: File[]) => void;
  busy: boolean;
}

export function UploadCard({ onFiles, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFiles(acceptedFiles);
    },
    [onFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [],
      "image/png": [],
      "image/jpeg": [],
    },
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      style={{
        width: "100%",
        minHeight: "260px",
        background: isDragActive ? "#FFF0E6" : "#FFFFFF",
        border: isDragActive ? "2px dashed #D95F00" : "2px dashed #F0D5C0",
        borderRadius: "16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 8px 24px -8px rgba(11,94,215,0.10)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        padding: "40px 24px",
        cursor: busy ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
      }}
      aria-label="Upload documents"
    >
      <input {...getInputProps({ ref: inputRef })} />

      {/* Illustration */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "20px",
            background: isDragActive ? "#D95F00" : "#FFF0E6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
        >
          {busy ? (
            <Loader2
              size={32}
              style={{
                color: isDragActive ? "#fff" : "#D95F00",
                animation: "spin 1s linear infinite",
              }}
            />
          ) : (
            <CloudUpload
              size={32}
              style={{ color: isDragActive ? "#fff" : "#D95F00" }}
            />
          )}
        </div>

        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#1A0A00",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {isDragActive ? "Drop files here" : "Upload Aadhaar Documents"}
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#64748B",
              marginTop: "6px",
              margin: "6px 0 0 0",
            }}
          >
            PDF, JPG or PNG · Up to 20 MB per file · Multi-page supported
          </p>
        </div>
      </div>

      {/* Browse button */}
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 32px",
          borderRadius: "10px",
          border: "none",
          background: busy ? "#F4A668" : "#D95F00",
          color: "#fff",
          fontSize: "15px",
          fontWeight: 600,
          cursor: busy ? "not-allowed" : "pointer",
          boxShadow: "0 2px 8px rgba(217,95,0,0.25)",
          transition: "background 0.15s, box-shadow 0.15s",
          letterSpacing: "0.01em",
        }}
        onMouseEnter={(e) => {
          if (!busy) (e.currentTarget as HTMLElement).style.background = "#b84f00";
        }}
        onMouseLeave={(e) => {
          if (!busy) (e.currentTarget as HTMLElement).style.background = "#D95F00";
        }}
      >
        Browse Files
      </button>

      {/* Security message */}
      <p
        style={{
          fontSize: "12px",
          color: "#9CA3AF",
          display: "flex",
          alignItems: "center",
          gap: "5px",
          margin: 0,
        }}
      >
        <span
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "#DCFCE7",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d="M1.5 4L3 5.5L6.5 2"
              stroke="#16A34A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        All processing happens locally in your browser. Files never leave your device.
      </p>
    </div>
  );
}
