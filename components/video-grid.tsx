"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  Clock,
  ExternalLink,
  Loader2,
  Play,
  Repeat,
  Share2,
  Users,
} from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddToCollectionDialog } from "./add-to-collection-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCreateRoom } from "@/hooks/use-create-room";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

type Props = {
  items: VideoItem[];
  view?: ViewMode;
  onPlay?: (item: VideoItem) => void;
  onToggleWatchLater?: (item: VideoItem) => void;
  isInWatchLater?: (id: string) => boolean;
  activeId?: string | null;
};

export function VideoGrid({
  items,
  view = "grid",
  onPlay,
  onToggleWatchLater,
  isInWatchLater,
  activeId,
}: Props) {
  if (items.length === 0) return null;

  return (
    <ul
      className={cn(
        view === "grid"
          ? "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4"
          : "flex flex-col gap-3",
      )}
    >
      {items.map((item) =>
        view === "grid" ? (
          <VideoTile
            key={item.id}
            item={item}
            onPlay={onPlay}
            onToggleWatchLater={onToggleWatchLater}
            queued={isInWatchLater?.(item.id) ?? false}
            active={item.id === activeId}
          />
        ) : (
          <VideoRow
            key={item.id}
            item={item}
            onPlay={onPlay}
            onToggleWatchLater={onToggleWatchLater}
            queued={isInWatchLater?.(item.id) ?? false}
            active={item.id === activeId}
          />
        ),
      )}
    </ul>
  );
}

function useShare() {
  const { toast } = useToast();
  return async (item: VideoItem) => {
    // Prefer the native share sheet on mobile, fall back to the clipboard.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: item.title, url: item.watchUrl });
        return;
      } catch {
        /* user dismissed the sheet — fall through to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(item.watchUrl);
      toast({ title: "Đã sao chép liên kết", description: item.title });
    } catch {
      toast({ title: "Không sao chép được liên kết" });
    }
  };
}

/** Opens a watch party for this video and sends the host into the room. */
function WatchTogetherButton({
  item,
  compact,
}: {
  item: VideoItem;
  compact?: boolean;
}) {
  const { createRoom, isCreating } = useCreateRoom();

  return (
    <Button
      type="button"
      size={compact ? "icon" : "sm"}
      variant="ghost"
      className={compact ? "h-8 w-8" : undefined}
      disabled={isCreating}
      onClick={() => void createRoom(item)}
      aria-label="Xem cùng nhau"
      title="Xem cùng nhau"
    >
      {isCreating ? (
        <Loader2 className={cn("h-4 w-4 animate-spin", !compact && "mr-1")} />
      ) : (
        <Users className={cn("h-4 w-4", !compact && "mr-1")} />
      )}
      {compact ? null : "Xem cùng"}
    </Button>
  );
}

function WatchLaterButton({
  queued,
  onClick,
  className,
}: {
  queued: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={queued ? "Xoá khỏi Xem sau" : "Thêm vào Xem sau"}
      title={queued ? "Xoá khỏi Xem sau" : "Thêm vào Xem sau"}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg backdrop-blur transition",
        queued
          ? "bg-primary text-primary-foreground"
          : "bg-black/60 text-white hover:bg-black/80",
        className,
      )}
    >
      <Clock className="h-4 w-4" />
    </button>
  );
}

/** Sends the user to /watch/<id>?loop=1 so the embed picks up loop mode. */
function LoopButton({ item, compact }: { item: VideoItem; compact?: boolean }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      size={compact ? "icon" : "sm"}
      variant="ghost"
      className={compact ? "h-8 w-8" : undefined}
      onClick={() => router.push(`/watch/${item.id}?loop=1`)}
      aria-label="Lặp lại video này"
      title="Lặp lại video này"
    >
      <Repeat className={cn("h-4 w-4", !compact && "mr-1")} />
      {compact ? null : "Lặp"}
    </Button>
  );
}

function Thumb({
  item,
  onPlay,
  className,
}: {
  item: VideoItem;
  onPlay?: (i: VideoItem) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onPlay?.(item)}
      className={cn("group/thumb relative block overflow-hidden bg-muted", className)}
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

      <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/90 shadow-lg">
          <Play className="h-5 w-5 translate-x-[1px] fill-current text-primary-foreground" />
        </span>
      </span>

      {item.durationSeconds > 0 ? (
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {formatDuration(item.durationSeconds)}
        </span>
      ) : null}
    </button>
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
  const share = useShare();

  return (
    <li
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5",
        active && "border-primary/60 ring-1 ring-primary/30",
      )}
    >
      <div className="relative">
        <Thumb item={item} onPlay={onPlay} className="aspect-video w-full" />

        {active ? (
          <Badge className="pointer-events-none absolute left-2 top-2 bg-primary text-primary-foreground">
            Đang phát
          </Badge>
        ) : null}

        {onToggleWatchLater ? (
          <WatchLaterButton
            queued={queued}
            onClick={() => onToggleWatchLater(item)}
            className={cn(
              "absolute right-2 top-2",
              // Always visible on touch screens, hover-revealed on desktop.
              queued ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
            )}
          />
        ) : null}
      </div>

      <div className="space-y-1.5 p-3 sm:p-3.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{item.channel}</p>
        <p className="text-xs text-muted-foreground">{formatViews(item.viewCount)}</p>

        <div className="flex items-center justify-between gap-1 pt-1.5">
          <Button asChild variant="link" size="sm" className="px-0 text-xs">
            <Link href={item.watchUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3.5 w-3.5" /> YouTube
            </Link>
          </Button>

          <div className="flex items-center gap-1">
            <WatchTogetherButton item={item} compact />
            <LoopButton item={item} compact />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => void share(item)}
              aria-label="Chia sẻ"
            >
              <Share2 className="h-4 w-4" />
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
      </div>

      <AddToCollectionDialog open={addOpen} onOpenChange={setAddOpen} item={item} />
    </li>
  );
}

function VideoRow({
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
  const share = useShare();

  return (
    <li
      className={cn(
        "group flex gap-3 rounded-2xl border border-border bg-card p-2.5 text-card-foreground transition",
        "hover:border-primary/40 sm:gap-4 sm:p-3",
        active && "border-primary/60 ring-1 ring-primary/30",
      )}
    >
      <Thumb
        item={item}
        onPlay={onPlay}
        className="aspect-video w-36 shrink-0 rounded-xl sm:w-52"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
          {item.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.channel}</p>
        <p className="text-xs text-muted-foreground">{formatViews(item.viewCount)}</p>

        <p className="mt-1 hidden line-clamp-2 text-xs text-muted-foreground sm:block">
          {item.description}
        </p>

        <div className="mt-auto flex items-center gap-1 pt-2">
          {onToggleWatchLater ? (
            <Button
              type="button"
              size="sm"
              variant={queued ? "secondary" : "ghost"}
              onClick={() => onToggleWatchLater(item)}
            >
              <Clock className="mr-1 h-3.5 w-3.5" />
              {queued ? "Trong hàng đợi" : "Xem sau"}
            </Button>
          ) : null}
          <WatchTogetherButton item={item} />
          <LoopButton item={item} />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => void share(item)}
            aria-label="Chia sẻ"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setAddOpen(true)}
            aria-label="Lưu vào danh sách"
          >
            <BookmarkPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AddToCollectionDialog open={addOpen} onOpenChange={setAddOpen} item={item} />
    </li>
  );
}
