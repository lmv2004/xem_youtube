"use client";
import { useEffect, useRef } from "react";

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
  loadVideo: (videoId: string, startSeconds: number) => void;
};

type Props = {
  videoId: string;
  /** Fired when the local viewer presses play/pause on the player itself. */
  onStateChange?: (playing: boolean, currentTime: number) => void;
  onReady?: (handle: SyncPlayerHandle) => void;
};

export function SyncPlayer({ videoId, onStateChange, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  // Keep callbacks in refs so re-renders never tear down the player; a
  // remount would restart playback and knock the whole room out of sync.
  const onStateChangeRef = useRef(onStateChange);
  const onReadyRef = useRef(onReady);
  onStateChangeRef.current = onStateChange;
  onReadyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;

    void loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current || playerRef.current) return;

      const player = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
￼        },
        events: {
          onReady: () => {
            onReadyRef.current?.({
              play: () => player.playVideo(),
              pause: () => player.pauseVideo(),
              seekTo: (s) => player.seekTo(s, true),
              getCurrentTime: () => player.getCurrentTime(),
              isPlaying: () => player.getPlayerState() === YT.PlayerState.PLAYING,
              loadVideo: (id, start) => player.loadVideoById(id, start),
            });
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              onStateChangeRef.current?.(true, player.getCurrentTime());
            } else if (event.data === YT.PlayerState.PAUSED) {
              onStateChangeRef.current?.(false, player.getCurrentTime());
            }
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // videoId changes are handled through loadVideo() on the handle, not by
    // recreating the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
