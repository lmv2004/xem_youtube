"use client";

import { useRouter } from "next/navigation";
import { Clock3, Flame } from "lucide-react";
import { VideoCard } from "@/components/video-card";
import { useWatchLater } from "@/hooks/use-watch-later";
import type { VideoItem } from "@/lib/types";

/** Hàng ngang "Xem tiếp" / "Thịnh hành" kéo được bằng cuộn ngang tự nhiên. */
export function ContinueWatchingRail({ items }: { items: VideoItem[] }) {
  const router = useRouter();
  const watchLater = useWatchLater();

  if (!items.length) return null;

  const onPlay = (item: VideoItem) => router.push(`/watch/${item.id}`);

  return (
    <section aria-label="Xem tiếp" className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <Clock3 className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">Xem tiếp</h2>
          <p className="text-xs text-muted-foreground">
            Video bạn đã lưu để xem sau
          </p>
        </div>
      </div>
      <div className="mask-fade-r -mx-1 overflow-x-auto px-1 pb-1 scrollbar-none">
        <div className="flex w-max gap-4">
          {items.slice(0, 10).map((item) => (
            <div key={item.id} className="w-64 shrink-0 sm:w-72">
              <VideoCard
                item={item}
                onPlay={onPlay}
                onToggleWatchLater={watchLater.toggle}
                isInWatchLater={watchLater.has}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrendingStrip({ items }: { items: VideoItem[] }) {
  const router = useRouter();
  const watchLater = useWatchLater();
  if (!items.length) return null;
  return (
    <section aria-label="Thịnh hành nhanh" className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
          <Flame className="h-4 w-4" />
        </span>
        <h2 className="font-display text-lg font-semibold">Đang nổi bật</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.slice(0, 4).map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(`/watch/${item.id}`)}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5 text-left hover:border-primary/40"
          >
            <span className="font-display text-2xl font-extrabold text-muted-foreground/50 group-hover:text-primary">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="line-clamp-2 text-xs font-semibold leading-5">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {item.channel}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="hidden">
        {watchLater.items.length ? null : null}
      </div>
    </section>
  );
}
