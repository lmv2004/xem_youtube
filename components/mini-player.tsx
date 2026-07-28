"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoItem } from "@/lib/types";
import { Expand, PictureInPicture2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  item: VideoItem | null;
  onClose: () => void;
  onExpand: () => void;
};

const STORAGE_KEY = "xemphim:miniPlayer:state";

type State = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function clampPosition(state: State): State {
  if (typeof window === "undefined") return state;
  const maxLeft = Math.max(window.innerWidth - state.width - 8, 8);
  const maxTop = Math.max(window.innerHeight - state.height - 8, 8);
  return {
    left: Math.min(Math.max(state.left, 8), maxLeft),
    top: Math.min(Math.max(state.top, 8), maxTop),
    width: state.width,
    height: state.height,
  };
}

function readState(): State {
  const defaultState: State = { left: 80, top: 80, width: 380, height: 230 };
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as State;
    if (
      typeof parsed.left === "number" &&
      typeof parsed.top === "number" &&
      typeof parsed.width === "number" &&
      typeof parsed.height === "number"
    ) {
      return clampPosition({
        left: parsed.left,
        top: parsed.top,
        width: Math.min(Math.max(parsed.width, 220), Math.min(window.innerWidth - 40, 720)),
        height: Math.min(Math.max(parsed.height, 140), Math.min(window.innerHeight - 40, 480)),
      });
    }
  } catch {
    /* ignore */
  }
  return defaultState;
}

// TvMini: a borderless, draggable, resizable video window.
// Closes only via right-click → "Đóng mini-player".
export function MiniPlayer({ item, onClose, onExpand }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ left: 80, top: 80, width: 380, height: 230 });
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const resizeState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setState(readState());
  }, []);

  // Persist position + size.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const onPointerDownMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Skip if the user is interacting with the resize handle or the menu.
      const target = e.target as HTMLElement;
      if (target.closest("[data-resize-handle]") || target.closest("[data-menu]")) return;
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
    if (resizeState.current && e.pointerId === resizeState.current.pointerId) {
      const r = resizeState.current;
      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;
      setState((prev) =>
        clampPosition({
          left: prev.left,
          top: prev.top,
          width: Math.min(Math.max(r.startWidth + dx, 220), Math.min(window.innerWidth - 40, 720)),
          height: Math.min(Math.max(r.startHeight + dy, 140), Math.min(window.innerHeight - 40, 480)),
        }),
      );
      return;
    }
    if (dragState.current && e.pointerId === dragState.current.pointerId) {
      const d = dragState.current;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      setState((prev) =>
        clampPosition({ ...prev, left: d.startLeft + dx, top: d.startTop + dy }),
      );
    }
  }, []);

  const endInteraction = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === e.pointerId) dragState.current = null;
    if (resizeState.current?.pointerId === e.pointerId) resizeState.current = null;
  }, []);

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!ref.current) return;
      resizeState.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: state.width,
        startHeight: state.height,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.stopPropagation();
    },
    [state.width, state.height],
  );

  if (!item) return null;
  const blocked = item.embeddable === false;

  function openPopOut() {
    if (typeof window === "undefined") return;
    const url = item!.watchUrl;
    // YouTube embed iframes don't expose HTMLVideoElement, so the native
    // Picture-in-Picture API isn't reachable. We open a new browser window
    // instead — the user can drag it to another monitor.
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Mini player — chuột phải để đóng"
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="group/tv fixed z-50 select-none overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl"
      style={{
        left: `${state.left}px`,
        top: `${state.top}px`,
        width: `${state.width}px`,
        height: `${state.height}px`,
      }}
      onPointerDown={onPointerDownMove}
      onPointerMove={onPointerMove}
      onPointerUp={endInteraction}
      onPointerCancel={endInteraction}
    >
      <div className="relative h-full w-full cursor-grab active:cursor-grabbing">
        {blocked ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-foreground/90 p-3 text-center text-background">
            <p className="text-xs">Video chặn nhúng.</p>
            <button
              type="button"
              onClick={onExpand}
              className="rounded-md bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
            >
              Mở rộng
            </button>
          </div>
        ) : (
          <iframe
            src={`${item.embedUrl}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="pointer-events-none h-full w-full"
          />
        )}
      </div>

      {/* Hover overlay: small bottom-center pop-out + expand, no close button. */}
      <div
        data-menu
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5 opacity-0 transition group-hover/tv:opacity-100",
        )}
      >
        <button
          type="button"
          data-menu
          onClick={(e) => {
            e.stopPropagation();
            openPopOut();
          }}
          className="pointer-events-auto rounded-full bg-black/70 p-1.5 text-white shadow-lg backdrop-blur transition hover:bg-black/90"
          aria-label="Mở trong cửa sổ riêng"
          title="Mở trong cửa sổ riêng"
        >
          <PictureInPicture2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          data-menu
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="pointer-events-auto rounded-full bg-black/70 p-1.5 text-white shadow-lg backdrop-blur transition hover:bg-black/90"
          aria-label="Phóng to trình phát"
          title="Phóng to trình phát"
        >
          <Expand className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Resize handle — bottom-right corner. */}
      <button
        type="button"
        data-resize-handle
        aria-label="Kéo để thay đổi kích thước"
        onPointerDown={startResize}
        className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize bg-[linear-gradient(135deg,transparent_50%,rgba(255,255,255,0.55)_50%)]"
      />
    </div>
  );
}
