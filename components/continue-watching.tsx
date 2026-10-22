"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Play, X } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { formatDuration } from "@/lib/format";
import {
  readWatchProgress,
  removeWatchProgress,
  WATCH_PROGRESS_EVENT,
  WATCH_PROGRESS_KEY,
  type WatchProgress,
} from "@/lib/watch-progress";

export function ContinueWatchingRail() {
  const t = useTranslations();
  const [entries, setEntries] = useState<WatchProgress[]>([]);
  useEffect(() => {
    const sync = () => setEntries(readWatchProgress());
    const storage = (event: StorageEvent) => {
      if (event.key === WATCH_PROGRESS_KEY || event.key === null) sync();
    };
    sync();
    window.addEventListener(WATCH_PROGRESS_EVENT, sync);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(WATCH_PROGRESS_EVENT, sync);
      window.removeEventListener("storage", storage);
    };
  }, []);
  if (!entries.length) return null;
  return (
    <section aria-labelledby="continue-watching-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="continue-watching-title"
            className="font-display text-xl font-bold"
          >
            {t("Tiếp tục xem")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Tiếp tục từ nơi bạn đã dừng trên thiết bị này.")}
          </p>
        </div>
      </div>
      <div className="flex snap-x gap-4 overflow-x-auto pb-3">
        {entries
          .slice(0, 8)
          .map(({ video, positionSeconds, durationSeconds }) => (
            <article
              key={video.id}
              className="group relative w-64 shrink-0 snap-start"
            >
              <Link
                href={`/watch/${video.id}?t=${Math.floor(positionSeconds)}`}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:opacity-80"
                  />
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/85 px-2 py-1 text-xs font-medium text-white">
                    <Play className="h-3 w-3" />
                    {formatDuration(positionSeconds)} /{" "}
                    {formatDuration(durationSeconds)}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.min(100, (positionSeconds / durationSeconds) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">
                  {video.title}
                </h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {video.channel}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => removeWatchProgress(video.id)}
                title={t("Xóa khỏi Tiếp tục xem")}
                aria-label={t("Xóa {p0} khỏi Tiếp tục xem", {
                  p0: video.title,
                })}
                className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full bg-black/80 text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="h-4 w-4" />
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}
