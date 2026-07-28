"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  item: VideoItem | null;
  onClose: () => void;
  onExpand: () => void;
};

const MINIMIZED_KEY = "xemphim:miniPlayer:pos";

type Position = { left: number; top: number };

function readPosition(): Position {
  if (typeof window === "undefined") return { left: 16, top: 80 };
  try {
    const raw = localStorage.getItem(MINIMIZED_KEY);
    if (!raw) return { left: 16, top: 80 };
    const parsed = JSON.parse(raw) as Position;
    if (
      typeof parsed.left === "number" &&
      typeof parsed.top === "number" &&
      parsed.left >= 0 &&
      parsed.top >= 0
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { left: 16, top: 80 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function MiniPlayer({ item, onClose, onExpand }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Position>({ left: 16, top: 80 });
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setPos(readPosition());
  }, []);

  // Persist position.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(MINIMIZED_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only initiate drag from the header (avoid hijacking clicks on the
      // iframe or controls).
      const target = e.target as HTMLElement;
      if (!target.closest("[data-drag-handle]")) return;
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      dragState.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: rect.left,
        startTop: rect.top,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const width = window.innerWidth - (ref.current?.offsetWidth ?? 320);
    const height = window.innerHeight - (ref.current?.offsetHeight ?? 180);
    setPos({
      left: clamp(drag.startLeft + dx, 12, Math.max(width - 12, 12)),
      top: clamp(drag.startTop + dy, 12, Math.max(height - 12, 12)),
    });
  }, []);

  const finishDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === e.pointerId) {
      dragState.current = null;
    }
  }, []);

  if (!item) return null;
  const blocked = item.embeddable === false;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Mini player"
      className="fixed z-50 w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-background/80 shadow-2xl backdrop-blur animate-in-up"
      style={{
        left: `${pos.left}px`,
        top: `${pos.top}px`,
        // Anchor by top-left so our manual left/top math is intuitive.
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <div
        data-drag-handle
        className="flex cursor-grab items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-1.5 text-xs active:cursor-grabbing"
        title="Kéo để di chuyển"
      >
        <span className="truncate font-medium">{item.title}</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onExpand}
            aria-label="Phóng to"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onClose}
            aria-label="Đóng mini player"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className={cn("relative aspect-video w-full bg-black")}>
        {blocked ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-foreground/90 p-3 text-center text-background">
            <p className="text-xs">Video chặn nhúng.</p>
            <Button asChild size="sm" variant="secondary">
              <a href={item.watchUrl} target="_blank" rel="noopener noreferrer">
                Mở YouTube
              </a>
            </Button>
          </div>
        ) : (
          <iframe
            src={`${item.embedUrl}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        )}
      </div>
    </div>
  );
}
