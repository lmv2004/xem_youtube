"use client";
import Link from "next/link";
import { useState } from "react";
import { BookmarkPlus, Clock, ExternalLink, Play } from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddToCollectionDialog } from "./add-to-collection-dialog";
import { cn } from "@/lib/utils";

type Props = {
  items: VideoItem[];
  onPlay?: (item: VideoItem) => void;
  onToggleWatchLater?: (item: VideoItem) => void;
  isInWatchLater?: (id: string) => boolean;
  activeId?: string | null;
};

export function VideoGrid({
  items,
  onPlay,
  onToggleWatchLater,
  isInWatchLater,
  activeId,
}: Props) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <VideoTile
          key={item.id}
          item={item}
          onPlay={onPlay}
          onToggleWatchLater={onToggleWatchLater}
          queued={isInWatchLater?.(item.id) ?? false}
          active={item.id === activeId}
        />
      ))}
    </ul>
  );
}

function VideoTile({
  item,
  onPlay,
  onToggleWatchLater,
  queued,
  active,
}: {
  item: VideoItem;
  onPlay?: (i: VideoItem) => void;
  onToggleWatchLater?: (i: VideoItem) => void;
  queued: boolean;
  active: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <li
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5",
        active && "border-primary/60 ring-1 ring-primary/30",
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <button
          type="button"
          onClick={() => onPlay?.(item)}
          className="block h-full w-full"
          aria-label={"Phát " + item.title}
        >
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail}
              alt=""
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Play />
            </div>
          )}

          {/* Hover overlay with a large play affordance */}
          <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/90 shadow-lg">
              <Play className="h-5 w-5 translate-x-[1px] fill-current text-primary-foreground" />
            </span>
          </span>
        </button>

        {item.durationSeconds > 0 ? (
          <Badge
            variant="secondary"
            className="pointer-events-none absolute bottom-2 right-2 bg-black/75 text-white"
          >
            {formatDuration(item.durationSeconds)}
          </Badge>
        ) : null}

        {active ? (
          <Badge className="pointer-events-none absolute left-2 top-2 bg-primary text-primary-foreground">
            Đang phát
          </Badge>
        ) : null}

        {onToggleWatchLater ? (
          <button
            type="button"
            onClick={() => onToggleWatchLater(item)}
            aria-label={queued ? "Xoá khỏi Xem sau" : "Thêm vào Xem sau"}
            title={queued ? "Xoá khỏi Xem sau" : "Thêm vào Xem sau"}
            className={cn(
              "absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg backdrop-blur transition",
              "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
              queued
                ? "bg-primary text-primary-foreground opacity-100"
                : "bg-black/60 text-white hover:bg-black/80",
            )}
          >
            <Clock className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="space-y-1.5 p-3.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{item.channel}</p>
        <p className="text-xs text-muted-foreground">{formatViews(item.viewCount)}</p>

        <div className="flex items-center justify-between pt-1.5">
          <Button asChild variant="link" size="sm" className="px-0 text-xs">
            <Link href={item.watchUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Mở YouTube
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAddOpen(true)}
            aria-label="Lưu vào danh sách"
          >
            <BookmarkPlus className="mr-1" /> Lưu
          </Button>
        </div>
      </div>

      <AddToCollectionDialog open={addOpen} onOpenChange={setAddOpen} item={item} />
    </li>
  );
}
