"use client";
import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  item: Pick<VideoItem, "id" | "title" | "thumbnail" | "embedUrl" | "watchUrl" | "embeddable">;
  className?: string;
  /** Auto-play when the iframe loads. Default false — we always show a play overlay first. */
  autoPlay?: boolean;
};

// Reusable YouTube embed wrapper. Shows a thumbnail + play button until the
// user clicks, then swaps to the iframe. Lazy-loads by deferring the iframe
// until interaction — keeps pages light and avoids multiple simultaneous
// autoplay instances on the favorites/history lists.
//
// When `item.embeddable === false` (the channel blocks embedding on this
// origin — common on LAN / company proxies), we skip the iframe entirely and
// show a "Mở YouTube" button so the user can still watch the video.
export function VideoEmbed({ item, className, autoPlay = false }: Props) {
  const [playing, setPlaying] = useState(autoPlay);
  const src = autoPlay
    ? `${item.embedUrl}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
    : `${item.embedUrl}?rel=0&modestbranding=1&playsinline=1`;

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-black", className)}>
      {item.embeddable === false ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-foreground/90 p-4 text-center text-background">
          <p className="text-sm font-medium">Video chặn nhúng trên trang này.</p>
          <Button asChild size="sm" variant="secondary">
            <a href={item.watchUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1" /> Mở trên YouTube
            </a>
          </Button>
        </div>
      ) : playing ? (
        <iframe
          src={src}
          title={item.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          className="h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group relative block h-full w-full"
          aria-label={`Phát ${item.title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full object-cover transition opacity-90 group-hover:opacity-75"
          />
          <span
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <span className="rounded-full bg-primary/90 p-3 text-primary-foreground shadow-lg transition group-hover:scale-110 sm:p-4">
              <Play className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
