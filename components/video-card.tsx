"use client";

import type { VideoItem } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";

type Props = {
  item: VideoItem;
  onPlay: (id: string) => void;
};

export function VideoCard({ item, onPlay }: Props) {
  const duration = formatDuration(item.durationSeconds);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-ink/10 bg-white/70 shadow-sm transition hover:border-accent">
      <button
        type="button"
        onClick={() => onPlay(item.id)}
        className="relative block w-full overflow-hidden bg-black"
        aria-label={`Xem video: ${item.title}`}
      >
        <div className="aspect-video w-full">
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
            <div className="flex h-full w-full items-center justify-center bg-ink/80 text-paper">
              <span className="text-xs">Không có hình thu nhỏ</span>
            </div>
          )}
        </div>
        {duration ? (
          <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-paper">
            {duration}
          </span>
        ) : null}
      </button>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink sm:text-base">
          {item.title}
        </h3>
        <p className="truncate text-xs text-muted">{item.channel}</p>
        <p className="mt-auto text-[11px] text-muted">{formatViews(item.viewCount)}</p>
      </div>
    </article>
  );
}
