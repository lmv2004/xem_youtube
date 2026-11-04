import { cn } from "@/lib/utils";
"use client";
import { useEffect, useRef } from "react";
import { createPlayerEventGuard, createPlayerVisibilityGuard } from "@/lib/player-event-guard";

/**
 * Minimal typings for the YouTube IFrame API.
 *
 * A plain <iframe> cannot be paused or seeked from script, which a watch party
 * needs. We load the official API instead of adding an npm dependency, and
 * declare only the members used here.
 */
type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoUrl: () => string;
  getPlayerState: () => number;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Loads the IFrame API once and shares the promise across all players. */
function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YTNamespace>((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    // The API calls this global exactly once when it finishes loading.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };

    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}

export type SyncPlayerHandle = {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  isBuffering: () => boolean;
  loadVideo: (videoId: string, startSeconds: number) => void;
};

type Props = {
  videoId: string;
  fillHeight?: boolean;
  compact?: boolean;
  /** Visible player state changes after scripted/lifecycle events are filtered. */
  onStateChange?: (playing: boolean, currentTime: number) => void;
  onReady?: (handle: SyncPlayerHandle) => void;
  onEnded?: (videoId: string, duration: number) => void;
};

export function SyncPlayer({ videoId, onStateChange, onReady, onEnded, fillHeight = false, compact = false }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  // Keep callbacks in refs so re-renders never tear down the player; a
  // remount would restart playback and knock the whole room out of sync.
  const onStateChangeRef = useRef(onStateChange);
  const onReadyRef = useRef(onReady);
  onStateChangeRef.current = onStateChange;
  onReadyRef.current = onReady;
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  useEffect(() => {
    let cancelled = false;
    const visibility = createPlayerVisibilityGuard(document.hidden);
    let pendingPause: ReturnType<typeof setTimeout> | undefined;
    const clearPause = () => { clearTimeout(pendingPause); pendingPause = undefined; };
    const visibilityChanged = () => {
      clearPause();
      visibility.change(document.hidden);
    };
    document.addEventListener("visibilitychange", visibilityChanged);

    void loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current || playerRef.current) return;

      const mount = document.createElement("div");
      const events = createPlayerEventGuard();
      containerRef.current.replaceChildren(mount);
      const player = new YT.Player(mount, {
        videoId,
        playerVars: { rel: 0, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            onReadyRef.current?.({
              play: () => { events.expect(true); player.playVideo(); },
              pause: () => { events.expect(false); player.pauseVideo(); },
              seekTo: (s) => { events.expect(player.getPlayerState() === YT.PlayerState.PLAYING); player.seekTo(s, true); },
              getCurrentTime: () => player.getCurrentTime(),
              isPlaying: () => player.getPlayerState() === YT.PlayerState.PLAYING,
              isBuffering: () => player.getPlayerState() === YT.PlayerState.BUFFERING,
              loadVideo: (id, start) => { events.expect(true, 2500); player.loadVideoById(id, start); },
            });
          },
          onStateChange: (event) => {
            clearPause();
            if (event.data === YT.PlayerState.PLAYING) {
              if (events.consume(true) || document.hidden || !visibility.allows()) return;
              onStateChangeRef.current?.(true, player.getCurrentTime());
            } else if (event.data === YT.PlayerState.ENDED) {
              endedRef.current?.(new URL(player.getVideoUrl()).searchParams.get("v") ?? "", player.getDuration());
            } else if (event.data === YT.PlayerState.PAUSED) {
              if (events.consume(false) || document.hidden || !visibility.allows()) return;
              // A lifecycle pause can arrive just before visibilitychange.
              // Briefly defer only pause; never publish it after hiding/restoring.
              pendingPause = setTimeout(() => {
                if (cancelled || document.hidden || !visibility.allows() || player.getPlayerState() !== YT.PlayerState.PAUSED) return;
                onStateChangeRef.current?.(false, player.getCurrentTime());
              }, 150);
            }
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      clearPause();
      document.removeEventListener("visibilitychange", visibilityChanged);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // videoId changes are handled through loadVideo() on the handle, not by
    // recreating the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        "aspect-video w-full overflow-hidden rounded-2xl bg-black transition-all",
        fillHeight && "lg:h-full lg:aspect-auto",
        compact && "max-h-[34vh] sm:max-h-[38vh] w-auto mx-auto shadow-xl border border-border/40"
      )}
    >
      <div ref={containerRef} className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />
    </div>
  );
}
