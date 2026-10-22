"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Play, Repeat, RotateCcw } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import {
  loadWatchPlayerApi,
  type WatchPlayerApi,
} from "@/lib/youtube-player-api";
import type { VideoItem } from "@/lib/types";

type Props = {
  video: VideoItem;
  autoPlay: boolean;
  loop: boolean;
  startSeconds: number;
  onReady(player: WatchPlayerApi | null): void;
  onProgress(seconds: number, duration: number): void;
};

/** One player for the lifetime of a video. Layout and preference changes never remount it. */
export function WatchPlayer({
  video,
  autoPlay,
  loop,
  startSeconds,
  onReady,
  onProgress,
}: Props) {
  const t = useTranslations();
  const [started, setStarted] = useState(autoPlay);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(loop);
  const container = useRef<HTMLDivElement>(null);
  const api = useRef<WatchPlayerApi | null>(null);
  const callbacks = useRef({ onReady, onProgress });
  callbacks.current = { onReady, onProgress };
  const loopRef = useRef(loopEnabled);
  loopRef.current = loopEnabled;
  const startRef = useRef(startSeconds);
  startRef.current = startSeconds;

  useEffect(() => {
    if (autoPlay) setStarted(true);
  }, [autoPlay]);

  useEffect(() => {
    setLoopEnabled(loop);
  }, [loop]);

  useEffect(() => {
    if (!started || video.embeddable === false) return;
    let disposed = false;
    let isReady = false;
    setReady(false);
    setFailed(false);
    const capture = () => {
      const player = api.current;
      if (!isReady || !player) return;
      const state = player.getPlayerState();
      // Do not replace a saved position with a zero reported before initial playback.
      if (state === 1 || state === 2 || state === 0) {
        callbacks.current.onProgress(
          player.getCurrentTime(),
          player.getDuration(),
        );
      }
    };
    const timeout = window.setTimeout(() => {
      if (!isReady && !disposed) setFailed(true);
    }, 20000);
    void loadWatchPlayerApi()
      .then((YT) => {
        if (disposed || !container.current) return;
        const mount = document.createElement("div");
        container.current.replaceChildren(mount);
        api.current = new YT.Player(mount, {
          videoId: video.id,
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            start: Math.floor(startRef.current),
            origin: window.location.origin,
          },
          events: {
            onReady: ({ target }) => {
              if (disposed) return;
              isReady = true;
              target.getIframe().title = video.title;
              window.clearTimeout(timeout);
              setFailed(false);
              setReady(true);
              callbacks.current.onReady(target);
            },
            onStateChange: ({ data, target }) => {
              if (disposed) return;
              if (data === 0) {
                callbacks.current.onProgress(
                  target.getDuration(),
                  target.getDuration(),
                );
                if (loopRef.current) {
                  target.seekTo(0, true);
                  target.playVideo();
                }
              } else if (data === 2) capture();
            },
            onError: () => {
              if (disposed) return;
              isReady = false;
              window.clearTimeout(timeout);
              setFailed(true);
              callbacks.current.onReady(null);
            },
          },
        });
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    const interval = window.setInterval(capture, 5000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") capture();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", capture);
    return () => {
      capture();
      disposed = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", capture);
      callbacks.current.onReady(null);
      api.current?.destroy();
      api.current = null;
    };
  }, [video.id, video.title, video.embeddable, started, attempt]);

  return (
    <div className="overflow-hidden bg-black">
      <div className="relative aspect-video min-h-[200px] w-full">
        <div
          ref={container}
          className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full"
        />
        {!started && video.embeddable !== false && (
          <button
            type="button"
            onClick={() => setStarted(true)}
            aria-label={t("Phát {p0}", { p0: video.title })}
            className="group absolute inset-0 grid w-full place-items-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={video.thumbnail}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-75"
              fetchPriority="high"
            />
            <span className="relative grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition group-hover:scale-105">
              <Play className="h-7 w-7" fill="currentColor" />
            </span>
          </button>
        )}
        {started && !ready && !failed && video.embeddable !== false && (
          <div
            className="pointer-events-none absolute inset-0 grid place-items-center bg-black/80 text-white"
            role="status"
          >
            <span className="flex items-center gap-2 text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("Đang tải trình phát…")}
            </span>
          </div>
        )}
        {(failed || video.embeddable === false) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 px-5 text-center text-white">
            <p className="max-w-md text-sm">
              {video.embeddable === false
                ? t("Video chặn nhúng trên trang này.")
                : t("Chưa tải được trình phát. Thử lại hoặc mở trên YouTube.")}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {video.embeddable !== false && (
                <Button
                  variant="secondary"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("Thử lại")}
                </Button>
              )}
              <Button asChild variant="secondary">
                <a
                  href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("Mở trên YouTube")}
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 border-t border-white/10 bg-zinc-950 px-3 text-xs text-zinc-300">
        <button
          type="button"
          aria-pressed={loopEnabled}
          onClick={() => setLoopEnabled((value) => !value)}
          className={`inline-flex min-h-11 items-center gap-2 rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${loopEnabled ? "text-emerald-300" : "hover:text-white"}`}
        >
          <Repeat className="h-4 w-4" />
          {t("Lặp lại:")} {loopEnabled ? t("Bật") : t("Tắt")}
        </button>
        <a
          href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 hover:text-white"
        >
          {t("Mở YouTube")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
