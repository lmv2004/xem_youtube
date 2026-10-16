"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  title: string;
  /** Poster thumbnail hiển thị trước khi iframe load xong. */
  poster?: string;
  /** Gọi khi player load thành công. */
  onReady?: () => void;
  className?: string;
};

/**
 * Lazy YouTube iframe với trạng thái loading rõ ràng:
 * - Hiển thị poster + spinner cho tới khi iframe fire `load`.
 * - Giữ nguyên hành vi autoplay của src (caller đã set autoplay=1).
 * - Không re-mount ngoài ý muốn: key do caller quyết định.
 */
export function LazyEmbed({ src, title, poster, onReady, className }: Props) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (loaded) onReady?.();
  }, [loaded, onReady]);

  return (
    <div className={cn("relative aspect-video w-full bg-black", className)}>
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center">
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
          ) : null}
          <div className="relative flex flex-col items-center gap-2 text-white/80">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="inline-flex items-center gap-1.5 text-xs">
              <PlayCircle className="h-4 w-4" /> Đang tải trình phát…
            </span>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
