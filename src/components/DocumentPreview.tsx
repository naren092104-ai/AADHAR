"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { ProcessedFile } from "@/types";
import { MaskLayer } from "@/components/MaskLayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ZoomValue = "25" | "50" | "100" | "150" | "200" | "fit-width" | "fit-page";

const ZOOM_OPTIONS: Array<{ value: ZoomValue; label: string }> = [
  { value: "25", label: "25%" },
  { value: "50", label: "50%" },
  { value: "100", label: "100%" },
  { value: "150", label: "150%" },
  { value: "200", label: "200%" },
  { value: "fit-width", label: "Fit width" },
  { value: "fit-page", label: "Fit page" },
];

interface Props {
  file: ProcessedFile;
}

export function DocumentPreview({ file }: Props) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState<ZoomValue>("fit-width");
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => {
    setPage(0);
    setPageInput("1");
  }, [file.id]);

  const pages = file.pages;
  const pageDetections = useMemo(
    () => file.detected.filter((item) => item.page === page),
    [file.detected, page],
  );
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);

  const goTo = (next: number) => {
    const clamped = Math.min(file.pages.length - 1, Math.max(0, next));
    setPage(clamped);
    setPageInput(String(clamped + 1));
    pageRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!pages.length) {
    return (
      <section className="surface-card flex min-h-64 items-center justify-center p-8 text-sm text-muted-foreground">
        Rendering pages…
      </section>
    );
  }

  const zoomStyle =
    zoom === "fit-width"
      ? { width: "100%" }
      : zoom === "fit-page"
        ? { maxHeight: "62vh", width: "auto" }
        : { width: `${Number(zoom)}%` };

  return (
    <section aria-labelledby="preview-heading" className="surface-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 id="preview-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Page {page + 1} of {file.pages.length} · {pageDetections.length} Aadhaar detected on this page
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="Next page"
          disabled={page >= file.pages.length - 1}
          onClick={() => goTo(page + 1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = Number(pageInput);
            if (Number.isFinite(parsed)) goTo(parsed - 1);
          }}
        >
          <Label htmlFor="goto-page" className="text-xs text-muted-foreground">
            Go to
          </Label>
          <Input
            id="goto-page"
            inputMode="numeric"
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            className="h-11 w-16"
          />
          <Button type="submit" variant="secondary" className="min-h-11">
            Go
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Label htmlFor="zoom-select" className="text-xs text-muted-foreground">
            Zoom
          </Label>
          <Select value={zoom} onValueChange={(value) => setZoom(value as ZoomValue)}>
            <SelectTrigger id="zoom-select" className="h-11 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZOOM_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>

      <div className="checker-surface max-h-[70vh] overflow-auto p-4">
        <div className="mx-auto w-full space-y-10">
          {pages.map((asset, index) => {
            const pageDetectionsForPage = file.detected.filter((item) => item.page === index);
            return (
              <div key={asset.index} ref={(ref) => (pageRefs.current[index] = ref)} className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 text-xs text-muted-foreground">
                  <span>Page {index + 1} of {file.pages.length}</span>
                  <span>{pageDetectionsForPage.length} Aadhaar detected</span>
                </div>
                <div className="mx-auto w-fit">
                  <div className="relative inline-block bg-card shadow-panel" style={zoomStyle}>
                    <img
                      src={asset.enhancedUrl}
                      alt={`${file.name} page ${index + 1}, masked preview`}
                      className="block h-auto w-full select-none"
                      draggable={false}
                    />
                    <MaskLayer
                      masks={file.masks}
                      page={index}
                      editing={false}
                      selectedId={null}
                      onSelect={() => undefined}
                      onCommit={() => undefined}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border p-4">
        <span className="text-xs font-medium text-muted-foreground">
          Detected on this page: {pageDetections.length} Aadhaar number(s)
        </span>
      </div>
    </section>
  );
}
