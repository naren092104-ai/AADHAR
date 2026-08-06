"use client";

import { CheckCircle2, CircleDashed, Loader2, MinusCircle, Trash2, XCircle } from "lucide-react";

import type { ProcessedFile, StageStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/utils/canvas";
import { cn } from "@/lib/utils";

interface Props {
  files: ProcessedFile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

function StatusIcon({ status }: { status: StageStatus }) {
  const label = status;
  if (status === "done")
    return <CheckCircle2 className="size-4 text-success" aria-label={`${label}: complete`} />;
  if (status === "running")
    return <Loader2 className="size-4 animate-spin text-primary" aria-label={`${label}: running`} />;
  if (status === "error")
    return <XCircle className="size-4 text-destructive" aria-label={`${label}: failed`} />;
  if (status === "skipped")
    return <MinusCircle className="size-4 text-muted-foreground" aria-label={`${label}: skipped`} />;
  return <CircleDashed className="size-4 text-muted-foreground" aria-label={`${label}: pending`} />;
}

const STAGES: Array<{ key: keyof ProcessedFile["statuses"]; label: string }> = [
  { key: "enhancement", label: "Enhance" },
  { key: "ocr", label: "OCR" },
  { key: "mask", label: "Mask" },
  { key: "compression", label: "Compress" },
  { key: "download", label: "Download" },
];

export function ProcessingDashboard({ files, activeId, onSelect, onRemove }: Props) {
  if (!files.length) return null;

  return (
    <section aria-labelledby="dashboard-heading" className="surface-card p-5">
      <h2 id="dashboard-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Processing dashboard
      </h2>
      <ul className="mt-4 space-y-3">
        {files.map((file) => (
          <li key={file.id}>
            <div
              className={cn(
                "rounded-xl border p-4 transition-colors",
                file.id === activeId ? "border-primary bg-accent/50" : "border-border bg-card",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(file.id)}
                  className="min-w-0 flex-1 text-left"
                  aria-current={file.id === activeId}
                >
                  <p className="truncate text-sm font-semibold">{file.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatBytes(file.size)} · {file.pageCount || "—"}{" "}
                    {file.pageCount === 1 ? "page" : "pages"} · {file.detected.length} Aadhaar found
                    {file.vidIgnored ? ` · ${file.vidIgnored} VID ignored` : ""}
                    {file.outputSize !== null ? ` · output ${formatBytes(file.outputSize)}` : ""}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <Badge variant={file.error ? "destructive" : "secondary"}>
                    {file.error ? "Failed" : file.progress === 100 ? "Ready" : "Working"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => onRemove(file.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              {file.progress < 100 && !file.error ? (
                <Progress value={file.progress} className="mt-3 h-2" aria-label="Processing progress" />
              ) : null}

              {file.error ? (
                <p role="alert" className="mt-3 text-xs font-medium text-destructive">
                  {file.error}
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {STAGES.map((stage) => (
                    <span key={stage.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <StatusIcon status={file.statuses[stage.key]} />
                      {stage.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
