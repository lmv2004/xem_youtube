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
            className="font-display text-xl font-bold flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            {t("Tiếp tục xem")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Tiếp tục từ nơi bạn đã dừng trên thiết bị này.")}
          </p>
        </div>
      </div>
      <div className="flex snap-x gap-4 overflow-x-auto pb-3 scrollbar-none">
        {entries
          .slice(0, 8)
          .map(({ video, positionSeconds, durationSeconds }) => (
            <article
              key={video.id}
              className="group relative w-64 shrink-0 snap-start rounded-2xl border border-border/40 bg-card/60 p-2.5 transition-all duration-300 hover:border-rose-500/30 hover:bg-card hover:shadow-lg hover:shadow-rose-500/5 hover:-translate-y-0.5"
            >
              <Link
                href={`/watch/${video.id}?t=${Math.floor(positionSeconds)}`}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
              >
                <div className="relative aspect-video overflow-hidden rounded-xl bg-muted/60 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-rose-600/90 text-white shadow-lg backdrop-blur-md">
                      <Play className="ml-0.5 h-4 w-4 fill-current" />
                    </span>
                  </div>
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-md border border-white/10">
                    <Play className="h-3 w-3 fill-current" />
                    {formatDuration(positionSeconds)} / {formatDuration(durationSeconds)}
                  </span>
                  {/* Glowing Progress bar */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                    <div
                      className="h-full bg-rose-500 shadow-sm shadow-rose-500"
                      style={{
                        width: `${Math.min(100, (positionSeconds / durationSeconds) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <h3 className="mt-2.5 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-rose-500 transition-colors">
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
                className="absolute right-3.5 top-3.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black hover:scale-110 active:scale-95 focus-visible:opacity-100 backdrop-blur-md border border-white/20"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </article>
          ))}
      </div>
    </section>
  );
}
