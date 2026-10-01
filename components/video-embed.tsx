"use client";
import { YouTubeFrame } from "@/components/youtube-frame";
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
  /** Loop the single video. Session-only, default false. YouTube requires the
   *  matching `playlist=<id>` query when `loop=1`, so we set both together. */
  loop?: boolean;
};

export function VideoEmbed(props: Props) {
  return <VideoEmbedContent key={`${props.item.id}:${props.autoPlay}`} {...props} />;
}

function VideoEmbedContent({ item, className, autoPlay = false, loop = false }: Props) {
  const [playing, setPlaying] = useState(autoPlay);

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
        <YouTubeFrame id={item.id} title={item.title} loop={loop} />
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
