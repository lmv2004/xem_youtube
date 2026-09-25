"use client";

import { ListVideo, Play, Trash2, X } from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  items: VideoItem[];
  currentId?: string | null;
  onPlay: (item: VideoItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

/** Queue panel for the watch-later list with modern frosted glass. */
export function WatchLaterPanel({ items, currentId, onPlay, onRemove, onClear }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-card/85 p-4 shadow-xl backdrop-blur-2xl space-y-3 animate-in-up">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-display text-sm sm:text-base font-bold text-foreground">
          <ListVideo className="h-4 w-4 text-rose-500" />
          Hàng đợi xem sau
          <Badge variant="secondary" className="h-5 px-1.5 text-[11px] rounded-full bg-white/10 border-white/10 font-bold">
            {items.length}
          </Badge>
        </h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-xl"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Xoá hết
        </Button>
      </div>

      <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {items.map((item) => {
          const playing = item.id === currentId;
          return (
            <li
              key={item.id}
              className={cn(
                "group flex items-center gap-3 rounded-xl p-2 transition-all duration-200",
                playing
                  ? "bg-rose-500/15 ring-1 ring-rose-500/40"
                  : "hover:bg-white/5",
              )}
            >
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-black/80 shadow"
                aria-label={"Phát " + item.title}
              >
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Play className="h-4 w-4 fill-white text-white" />
                </span>
                {item.durationSeconds > 0 ? (
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[10px] font-semibold text-white">
                    {formatDuration(item.durationSeconds)}
                  </span>
                ) : null}
              </button>

              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
                  {item.title}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{item.channel}</p>
                {playing ? (
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                    Đang phát
                  </span>
                ) : null}
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onRemove(item.id)}
                aria-label="Xoá khỏi hàng đợi"
                className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
