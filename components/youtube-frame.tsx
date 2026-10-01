"use client";

import { useState } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import { youtubeEmbedUrl } from "@/lib/youtube-embed";

export function YouTubeFrame({ id, title, loop = false }: { id: string; title: string; loop?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <div className="flex h-full w-full flex-col bg-black">
      <iframe
        key={`${id}:${attempt}`}
        src={youtubeEmbedUrl(id, loop)}
        title={title}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="min-h-0 w-full flex-1 border-0"
      />
      <div data-menu className="flex shrink-0 items-center justify-end gap-4 border-t border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="inline-flex items-center gap-1.5 hover:text-white" aria-label="Tải lại video">
          <RotateCcw className="h-3.5 w-3.5" /> Tải lại
        </button>
        <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
          Mở YouTube <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
