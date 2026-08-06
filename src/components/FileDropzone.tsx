"use client";

import { useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { FileUp, Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onFiles: (files: File[]) => void;
  busy: boolean;
}

export function FileDropzone({ onFiles, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      onFiles(Array.from(list));
    },
    [onFiles],
  );

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
      className={cn(
        "surface-card flex flex-col items-center justify-center gap-6 border border-border px-8 py-12 text-center transition duration-200",
        isDragActive ? "border-primary bg-primary/10 shadow-lg" : "bg-white",
      )}
    >
      <input {...getInputProps()} ref={inputRef} />
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-white shadow-sm">
        {busy ? (
          <Loader2 className="size-8 animate-spin" aria-hidden="true" />
        ) : (
          <UploadCloud className="size-8" aria-hidden="true" />
        )}
      </div>
      <div>
        <h2 className="text-2xl font-semibold">Upload Aadhaar Document</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          PDF, JPG, PNG · Maximum 20 MB · Multi-page supported
        </p>
      </div>
      <Button size="lg" className="min-h-12 px-8" disabled={busy} onClick={() => inputRef.current?.click()}>
        <FileUp aria-hidden="true" />
        Browse files
      </Button>
      <p className="text-xs text-muted-foreground">Files never leave your browser.</p>
    </div>
  );
}
