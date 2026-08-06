"use client";

import { useCallback, useRef, useState } from "react";

import type { MaskRect } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  masks: MaskRect[];
  page: number;
  editing: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCommit: (updater: (masks: MaskRect[]) => MaskRect[]) => void;
}

type Drag =
  | { kind: "create"; startX: number; startY: number }
  | { kind: "move"; id: string; offsetX: number; offsetY: number }
  | { kind: "resize"; id: string; anchorX: number; anchorY: number };

const MIN_SIZE = 0.008;

export function MaskLayer({ masks, page, editing, selectedId, onSelect, onCommit }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const pageMasks = masks.filter((mask) => mask.page === page);

  const point = useCallback((event: React.PointerEvent) => {
    const rect = layerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent) => {
    if (!editing || event.button !== 0) return;
    if (event.target !== layerRef.current) return;
    const { x, y } = point(event);
    dragRef.current = { kind: "create", startX: x, startY: y };
    setDraft({ x, y, w: 0, h: 0 });
    onSelect(null);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = point(event);
    if (drag.kind === "create") {
      setDraft({
        x: Math.min(drag.startX, x),
        y: Math.min(drag.startY, y),
        w: Math.abs(x - drag.startX),
        h: Math.abs(y - drag.startY),
      });
      return;
    }
    if (drag.kind === "move") {
      onCommitLive((mask) => ({
        ...mask,
        x: Math.min(1 - mask.w, Math.max(0, x - drag.offsetX)),
        y: Math.min(1 - mask.h, Math.max(0, y - drag.offsetY)),
      }), drag.id);
      return;
    }
    onCommitLive((mask) => ({
      ...mask,
      x: Math.min(drag.anchorX, x),
      y: Math.min(drag.anchorY, y),
      w: Math.max(MIN_SIZE, Math.abs(x - drag.anchorX)),
      h: Math.max(MIN_SIZE, Math.abs(y - drag.anchorY)),
    }), drag.id);
  };

  const liveRef = useRef<((masks: MaskRect[]) => MaskRect[]) | null>(null);

  const onCommitLive = (update: (mask: MaskRect) => MaskRect, id: string) => {
    liveRef.current = (all) => all.map((mask) => (mask.id === id ? update(mask) : mask));
    onCommit(liveRef.current);
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.kind === "create" && draft && draft.w > MIN_SIZE && draft.h > MIN_SIZE) {
      const id = `manual_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      onCommit((all) => [...all, { id, page, ...draft, source: "manual" }]);
      onSelect(id);
    }
    setDraft(null);
  };

  return (
    <div
      ref={layerRef}
      className={cn("absolute inset-0", editing ? "cursor-crosshair" : "pointer-events-none")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role={editing ? "application" : undefined}
      aria-label={editing ? "Manual mask editor. Drag to draw a black mask." : undefined}
    >
      {pageMasks.map((mask) => (
        <div
          key={mask.id}
          role={editing ? "button" : undefined}
          tabIndex={editing ? 0 : -1}
          aria-label={`${mask.source === "ocr" ? "Detected" : "Manual"} mask`}
          onKeyDown={(event) => {
            if (!editing) return;
            if (event.key === "Delete" || event.key === "Backspace") {
              event.preventDefault();
              onCommit((all) => all.filter((item) => item.id !== mask.id));
            }
          }}
          onPointerDown={(event) => {
            if (!editing) return;
            event.stopPropagation();
            onSelect(mask.id);
            const rect = layerRef.current?.getBoundingClientRect();
            if (!rect) return;
            dragRef.current = {
              kind: "move",
              id: mask.id,
              offsetX: (event.clientX - rect.left) / rect.width - mask.x,
              offsetY: (event.clientY - rect.top) / rect.height - mask.y,
            };
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          }}
          className={cn(
            "absolute bg-black",
            editing && "cursor-move ring-offset-1",
            editing && selectedId === mask.id && "ring-2 ring-primary",
          )}
          style={{
            left: `${mask.x * 100}%`,
            top: `${mask.y * 100}%`,
            width: `${mask.w * 100}%`,
            height: `${mask.h * 100}%`,
          }}
        >
          {editing && selectedId === mask.id ? (
            <span
              role="presentation"
              onPointerDown={(event) => {
                event.stopPropagation();
                dragRef.current = {
                  kind: "resize",
                  id: mask.id,
                  anchorX: mask.x,
                  anchorY: mask.y,
                };
                (event.currentTarget.parentElement as HTMLElement).setPointerCapture(event.pointerId);
              }}
              className="absolute -bottom-1.5 -right-1.5 size-3.5 cursor-nwse-resize rounded-full border-2 border-primary-foreground bg-primary"
            />
          ) : null}
        </div>
      ))}

      {draft ? (
        <div
          className="absolute border-2 border-primary bg-black/70"
          style={{
            left: `${draft.x * 100}%`,
            top: `${draft.y * 100}%`,
            width: `${draft.w * 100}%`,
            height: `${draft.h * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
}
