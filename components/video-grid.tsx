"use client";
import Link from "next/link";
import type { VideoItem } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookmarkPlus, Play } from "lucide-react";
import { useState } from "react";
import { AddToCollectionDialog } from "./add-to-collection-dialog";

type Props = {
  items: VideoItem[];
  onPlay?: (item: VideoItem) => void;
};

export function VideoGrid({ items, onPlay }: Props) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <VideoTile key={item.id} item={item} onPlay={onPlay} />
      ))}
    </ul>
  );
}

function VideoTile({ item, onPlay }: { item: VideoItem; onPlay?: (i: VideoItem) => void }) {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <li className="group overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm transition hover:border-primary/40">
      <button
        type="button"
        onClick={() => onPlay?.(item)}
        className="block w-full"
        aria-label={`Phát ${item.title}`}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {item.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail}
              alt=""
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Play />
            </div>
          )}
          {item.durationSeconds > 0 ? (
            <Badge variant="secondary" className="absolute bottom-2 right-2 bg-black/70 text-white">
              {formatDuration(item.durationSeconds)}
            </Badge>
          ) : null}
        </div>
      </button>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{item.channel}</p>
        <p className="text-xs text-muted-foreground">{formatViews(item.viewCount)}</p>
        <div className="flex items-center justify-between pt-1">
          <Button asChild variant="link" size="sm" className="px-0">
            <Link href={item.watchUrl} target="_blank" rel="noopener noreferrer">
              Mở YouTube
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
      <AddToCollectionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        item={item}
      />
    </li>
  );
}
