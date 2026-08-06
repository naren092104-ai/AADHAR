import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { AppSettings, MaskRect, ProcessedFile } from "@/types";
import { emptyFile, processFile, validateFile } from "@/services/pipeline";
import { downloadBlob, exportFile } from "@/services/export";
import { releaseOcr } from "@/services/ocr";
import { purgeAll, purgeCanvases } from "@/services/store";

interface History {
  past: MaskRect[][];
  future: MaskRect[][];
}

const DEFAULT_SETTINGS: AppSettings = {
  autoEnhance: false,
  autoOcr: true,
  autoMask: true,
  compression: true,
};

export function useDocumentQueue() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const historyRef = useRef<Map<string, History>>(new Map());
  const processingControllerRef = useRef<AbortController | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    return () => {
      purgeAll();
      void releaseOcr();
    };
  }, []);

  const patchFile = useCallback((id: string, patch: Partial<ProcessedFile>) => {
    setFiles((current) =>
      current.map((file) => (file.id === id ? { ...file, ...patch } : file)),
    );
  }, []);

  const cancelProcessing = useCallback(() => {
    if (!processingControllerRef.current) return;
    processingControllerRef.current.abort();
    setProcessingMessage("Cancelling processing...");
  }, []);

  const addFiles = useCallback(
    async (incoming: File[]) => {
      const accepted: Array<{ record: ProcessedFile; file: File }> = [];
      for (const file of incoming) {
        const error = validateFile(file);
        if (error) {
          toast.error("File rejected", { description: error });
          continue;
        }
        accepted.push({ record: emptyFile(file), file });
      }
      if (!accepted.length) return;

      setFiles((current) => [...current, ...accepted.map((item) => item.record)]);
      setActiveId((current) => current ?? accepted[0].record.id);
      setIsProcessing(true);
      setProcessingMessage("Preparing document processing...");
      processingControllerRef.current = new AbortController();
      const signal = processingControllerRef.current.signal;

      for (const { record, file } of accepted) {
        const currentRecord = { ...record };

        try {
          await processFile(record, file, settingsRef.current, {
            onPatch: (patch) => {
              Object.assign(currentRecord, patch);
              patchFile(record.id, patch);
            },
            onStatus: (status) => setProcessingMessage(status),
            signal,
          });

          if (
            !signal.aborted &&
            currentRecord.pages.length > 0 &&
            currentRecord.detected.length === currentRecord.masks.length
          ) {
            try {
              const result = await exportFile(
                currentRecord,
                "masked",
                currentRecord.kind === "pdf" ? "pdf" : "jpg",
                settingsRef.current.compression,
              );
              downloadBlob(result.blob, result.filename);
              toast.success("Auto download ready", {
                description: `${result.filename} · ${Math.round(result.blob.size / 1024)} KB`,
              });
            } catch (error) {
              const message = error instanceof Error ? error.message : "Auto-download failed.";
              toast.error("Auto-download failed", { description: message });
            }
          }

          historyRef.current.set(record.id, { past: [], future: [] });
          toast.success(`${record.name} processed`, {
            description: "Aadhaar masking completed and file exported automatically.",
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Processing failed unexpectedly.";
          patchFile(record.id, {
            error: message,
            progress: 100,
            statuses: {
              enhancement: "error",
              ocr: "error",
              mask: "error",
              compression: "idle",
              download: "idle",
            },
          });
          toast.error(`Could not process ${record.name}`, { description: message });
          if (signal.aborted) {
            setProcessingMessage("Processing stopped.");
            break;
          }
        }
      }
      setIsProcessing(false);
      setProcessingMessage(null);
      processingControllerRef.current = null;
      await releaseOcr();
    },
    [patchFile],
  );

  const commitMasks = useCallback(
    (id: string, updater: (masks: MaskRect[]) => MaskRect[]) => {
      setFiles((current) =>
        current.map((file) => {
          if (file.id !== id) return file;
          const history = historyRef.current.get(id) ?? { past: [], future: [] };
          history.past = [...history.past, file.masks].slice(-40);
          history.future = [];
          historyRef.current.set(id, history);
          const masks = updater(file.masks);
          return {
            ...file,
            masks,
            statuses: { ...file.statuses, mask: masks.length ? "done" : "idle" },
          };
        }),
      );
    },
    [],
  );

  const undo = useCallback((id: string) => {
    setFiles((current) =>
      current.map((file) => {
        if (file.id !== id) return file;
        const history = historyRef.current.get(id);
        if (!history?.past.length) return file;
        const previous = history.past[history.past.length - 1];
        history.past = history.past.slice(0, -1);
        history.future = [file.masks, ...history.future];
        historyRef.current.set(id, history);
        return { ...file, masks: previous };
      }),
    );
  }, []);

  const redo = useCallback((id: string) => {
    setFiles((current) =>
      current.map((file) => {
        if (file.id !== id) return file;
        const history = historyRef.current.get(id);
        if (!history?.future.length) return file;
        const next = history.future[0];
        history.future = history.future.slice(1);
        history.past = [...history.past, file.masks];
        historyRef.current.set(id, history);
        return { ...file, masks: next };
      }),
    );
  }, []);

  const canUndo = useCallback(
    (id: string) => (historyRef.current.get(id)?.past.length ?? 0) > 0,
    [],
  );
  const canRedo = useCallback(
    (id: string) => (historyRef.current.get(id)?.future.length ?? 0) > 0,
    [],
  );

  const removeFile = useCallback((id: string) => {
    purgeCanvases(id);
    historyRef.current.delete(id);
    setFiles((current) => {
      const next = current.filter((file) => file.id !== id);
      setActiveId((active) => (active === id ? (next[0]?.id ?? null) : active));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    purgeAll();
    historyRef.current.clear();
    setFiles([]);
    setActiveId(null);
    void releaseOcr();
    toast.success("Session cleared", {
      description: "All document data was removed from memory.",
    });
  }, []);

  return {
    files,
    activeFile: files.find((file) => file.id === activeId) ?? null,
    activeId,
    setActiveId,
    settings,
    setSettings,
    isProcessing,
    processingMessage,
    addFiles,
    cancelProcessing,
    patchFile,
    commitMasks,
    undo,
    redo,
    canUndo,
    canRedo,
    removeFile,
    clearAll,
  };
}
