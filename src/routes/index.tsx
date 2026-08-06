"use client";

import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { DocumentPreviewNew } from "@/components/DocumentPreviewNew";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProcessingSummary } from "@/components/ProcessingSummary";
import { QuickActions } from "@/components/QuickActions";
import { StatsRow } from "@/components/StatsRow";
import { UploadCard } from "@/components/UploadCard";
import { useDocumentQueue } from "@/hooks/useDocumentQueue";
import { useTheme } from "@/hooks/useTheme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aadhaar Mask Pro — Secure Browser-Only Aadhaar Masking" },
      {
        name: "description",
        content:
          "Bank-grade browser tool that enhances Aadhaar scans, detects Aadhaar numbers with OCR and masks the first eight digits. No upload, no cloud.",
      },
      { property: "og:title", content: "Aadhaar Mask Pro — Secure Browser-Only Aadhaar Masking" },
      {
        property: "og:description",
        content:
          "Enhance, OCR and mask Aadhaar documents entirely inside the browser. Batch PDF and image support with 1 MB optimised exports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CONTENT_WIDTH = "1400px";

function Index() {
  const queue = useDocumentQueue();
  const { theme, toggle: toggleTheme } = useTheme();

  const totalPages = queue.files.reduce((sum, f) => sum + f.pageCount, 0);
  const totalMasked = queue.files.reduce((sum, f) => sum + f.masks.length, 0);
  const totalAadhaar = queue.files.reduce((sum, f) => sum + f.detected.length, 0);

  const hasFiles = queue.files.length > 0;
  const hasDoneFiles = queue.files.some((f) => f.progress === 100 && !f.error);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#F7F9FC",
        fontFamily:
          '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        color: "#0F172A",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <AppHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        onClearSession={queue.clearAll}
        canClear={queue.files.length > 0 || queue.isProcessing}
      />

      {/* ── MAIN ──────────────────────────────────────────────────────── */}
      <main style={{ flex: 1 }}>
        <ErrorBoundary>
          <div
            style={{
              maxWidth: CONTENT_WIDTH,
              margin: "0 auto",
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            {/* ── ROW 1: Upload card ──────────────────────────────────── */}
            <UploadCard
              onFiles={(files) => void queue.addFiles(files)}
              busy={queue.isProcessing}
            />

            {/* Processing status banner (only while running) */}
            {queue.processingMessage && (
              <ProcessingBanner
                message={queue.processingMessage}
                onCancel={queue.cancelProcessing}
                canCancel={queue.isProcessing}
              />
            )}

            {/* ── ROW 2: Stats (only when files exist) ──────────────── */}
            {hasFiles && (
              <StatsRow
                documents={queue.files.length}
                pages={totalPages}
                aadhaarFound={totalAadhaar}
                masked={totalMasked}
              />
            )}

            {/* ── ROW 3: Quick actions (only when done files exist) ──── */}
            {hasDoneFiles && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <SectionLabel>Quick Actions</SectionLabel>
                <QuickActions
                  file={queue.activeFile}
                  files={queue.files}
                  compression={queue.settings.compression}
                  onPatch={queue.patchFile}
                />
              </div>
            )}

            {/* ── ROW 4: Processing summary (when files exist) ─────────── */}
            {hasFiles && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <SectionLabel>Processing Summary</SectionLabel>
                <ProcessingSummary
                  files={queue.files}
                  activeId={queue.activeId}
                  onSelect={queue.setActiveId}
                  onRemove={queue.removeFile}
                />
              </div>
            )}

            {/* ── ROW 5: Document preview ──────────────────────────────── */}
            {queue.activeFile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <SectionLabel>Document Preview</SectionLabel>
                <DocumentPreviewNew file={queue.activeFile} />
              </div>
            ) : !hasFiles ? (
              <EmptyState />
            ) : null}
          </div>
        </ErrorBoundary>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <AppFooter />
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "11px",
        fontWeight: 700,
        color: "#9CA3AF",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

function ProcessingBanner({
  message,
  onCancel,
  canCancel,
}: {
  message: string;
  onCancel: () => void;
  canCancel: boolean;
}) {
  return (
    <div
      style={{
        background: "#EFF6FF",
        borderRadius: "12px",
        border: "1px solid #BFDBFE",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#0B5ED7",
            animation: "pulse 1.5s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
        <div>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#1D4ED8", margin: 0 }}>
            Processing…
          </p>
          <p style={{ fontSize: "12px", color: "#3B82F6", margin: "2px 0 0 0" }}>{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        disabled={!canCancel}
        style={{
          padding: "7px 16px",
          borderRadius: "8px",
          border: "1px solid #BFDBFE",
          background: "#fff",
          color: "#1D4ED8",
          fontSize: "12px",
          fontWeight: 600,
          cursor: canCancel ? "pointer" : "not-allowed",
          opacity: canCancel ? 1 : 0.5,
        }}
      >
        Cancel
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        border: "1px solid #E5E7EB",
        padding: "64px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <span
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          background: "#EFF6FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#0B5ED7",
        }}
      >
        <Sparkles size={24} />
      </span>
      <div>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#0F172A",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Ready to process Aadhaar documents
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "#64748B",
            marginTop: "6px",
            margin: "8px auto 0",
            maxWidth: "400px",
            lineHeight: "1.6",
          }}
        >
          Upload an Aadhaar PDF or photo above. The app will automatically enhance the scan,
          run OCR to detect Aadhaar numbers, and mask the first eight digits.
        </p>
      </div>
    </div>
  );
}
