"use client";

import { useMemo } from "react";

import type { ProcessedFile } from "@/types";
import { MaskLayer } from "@/components/MaskLayer";

interface Props {
  file: ProcessedFile;
}

export function DocumentPreviewNew({ file }: Props) {
  const pages = file.pages;

  if (!pages.length) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid #E5E7EB",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.08)",
          padding: "64px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9CA3AF",
          fontSize: "14px",
        }}
      >
        Rendering pages…
      </div>
    );
  }

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
          borderBottom: "1px solid #FDF0E8",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "#1A0A00",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Document Preview
          </h2>
          <p style={{ fontSize: "12px", color: "#7A4A2A", margin: "2px 0 0 0" }}>
            {file.name} · {pages.length} page{pages.length !== 1 ? "s" : ""} ·{" "}
            {file.detected.length} Aadhaar detected
          </p>
        </div>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: 600,
            background: "#DCFCE7",
            color: "#15803D",
          }}
        >
          Masked
        </span>
      </div>

      {/* Pages — vertical scroll, masked only */}
      <div
        style={{
          padding: "24px",
          background: "#FFF8F3",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
        }}
      >
        {pages.map((page, index) => {
          const pageDetections = file.detected.filter((d) => d.page === index);

          return (
            <div key={page.index} style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {/* Page label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#7A4A2A",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Page {index + 1}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#9CA3AF",
                  }}
                >
                  {pageDetections.length} Aadhaar on this page
                </span>
              </div>

              {/* Masked only */}
              <PagePane
                label="Masked"
                src={page.enhancedUrl}
                file={file}
                pageIndex={index}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PagePane({
  label,
  src,
  file,
  pageIndex,
}: {
  label: string;
  src: string;
  file: ProcessedFile;
  pageIndex: number;
}) {
  const pageMasks = useMemo(
    () => file.masks.filter((m) => m.page === pageIndex),
    [file.masks, pageIndex],
  );

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        border: "1px solid #F0D5C0",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Pane label */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid #FDF0E8",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "#FFF8F3",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#D95F00",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#7A4A2A",
            letterSpacing: "0.03em",
          }}
        >
          {label}
        </span>
      </div>

      {/* Image */}
      <div style={{ position: "relative", lineHeight: 0, background: "#F9FAFB" }}>
        <img
          src={src}
          alt={`Page ${pageIndex + 1} ${label}`}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            userSelect: "none",
          }}
          draggable={false}
        />
        {pageMasks.length > 0 && (
          <MaskLayer
            masks={file.masks}
            page={pageIndex}
            editing={false}
            selectedId={null}
            onSelect={() => undefined}
            onCommit={() => undefined}
          />
        )}
      </div>
    </div>
  );
}
