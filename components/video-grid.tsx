"use client";

import type { VideoItem } from "@/lib/types";
import { VideoCard, VideoCardSkeleton } from "@/components/video-card";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

type Props = {
  items: VideoItem[];
  view?: ViewMode;
  onPlay?: (item: VideoItem) => void;
  onToggleWatchLater?: (item: VideoItem) => void;
  isInWatchLater?: (id: string) => boolean;
  activeId?: string | null;
  className?: string;
};

export function VideoGrid({
  items,
  view = "grid",
  onPlay,
  onToggleWatchLater,
  isInWatchLater,
  activeId,
  className,
}: Props) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        view === "grid"
          ? "grid grid-cols-1 gap-x-5 gap-y-7 min-[520px]:grid-cols-2 xl:grid-cols-3"
          : "flex flex-col gap-3",
        className,
      )}
    >
      {items.map((item) => (
        <VideoCard
          key={item.id}
          item={item}
          view={view}
          onPlay={onPlay}
          onToggleWatchLater={onToggleWatchLater}
          isInWatchLater={isInWatchLater}
          active={item.id === activeId}
        />
      ))}
    </div>
  );
}

export function VideoGridSkeleton({
  count = 8,
  view = "grid",
  className,
}: {
  count?: number;
  view?: ViewMode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        view === "grid"
          ? "grid grid-cols-1 gap-x-5 gap-y-7 min-[520px]:grid-cols-2 xl:grid-cols-3"
          : "flex flex-col gap-3",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} view={view} />
      ))}
    </div>
  );
}
