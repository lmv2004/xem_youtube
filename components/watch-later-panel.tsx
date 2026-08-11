"use client";
import { ListVideo, Play, Trash2, X } from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Glass } from "@/components/ui/glass";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  items: VideoItem[];
  currentId?: string | null;
  onPlay: (item: VideoItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

/** Queue panel for the watch-later list. Hidden entirely when empty. */
export function WatchLaterPanel({ items, currentId, onPlay, onRemove, onClear }: Props) {
  if (items.length === 0) return null;

  return (
    <Glass intensity="soft" className="space-y-3 p-4 animate-in-up">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold">
          <ListVideo className="h-4 w-4 text-primary" />
          Hàng đợi phát
          <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
            {items.length}
          </Badge>
        </h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="text-muted-foreground"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Xoá hết
        </Button>
      </div>

      <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
        {items.map((item) => {
          const playing = item.id === currentId;
          return (
            <li
              key={item.id}
              className={cn(
                "group flex items-center gap-3 rounded-xl p-2 transition",
                playing ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-foreground/5",
              )}
            >
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-muted"
                aria-label={"Phát " + item.title}
              >
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Play className="h-4 w-4 text-white" />
                </span>
                {item.durationSeconds > 0 ? (
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-1 text-[10px] text-white">
                    {formatDuration(item.durationSeconds)}
                  </span>
                ) : null}
              </button>

              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-medium leading-snug">{item.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{item.channel}</p>
                {playing ? (
                  <span className="text-[11px] font-medium text-primary">Đang phát</span>
                ) : null}
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onRemove(item.id)}
                aria-label="Xoá khỏi hàng đợi"
                className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>
    </Glass>
  );
}
