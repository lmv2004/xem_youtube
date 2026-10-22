/** A small, dependency-free adapter for the official YouTube IFrame API. */
export type WatchPlayerApi = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  isMuted(): boolean;
  mute(): void;
  unMute(): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
};

type Namespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady(event: { target: WatchPlayerApi }): void;
        onStateChange(event: { data: number; target: WatchPlayerApi }): void;
        onError(event: { data: number }): void;
        onAutoplayBlocked?(): void;
      };
    },
  ) => WatchPlayerApi;
};
type ApiWindow = { YT?: Namespace; onYouTubeIframeAPIReady?: () => void };
let pending: Promise<Namespace> | null = null;

export function loadWatchPlayerApi(): Promise<Namespace> {
  const browser = window as unknown as ApiWindow;
  if (browser.YT?.Player) return Promise.resolve(browser.YT);
  if (pending) return pending;
  pending = new Promise<Namespace>((resolve, reject) => {
    const previous = browser.onYouTubeIframeAPIReady;
    const timer = window.setTimeout(() => {
      // A blocked/stalled request must be reloadable on the next explicit retry.
      if (!browser.YT?.Player)
        document.getElementById("youtube-iframe-api")?.remove();
      pending = null;
      reject(new Error("YouTube API timed out"));
    }, 15000);
    browser.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (browser.YT?.Player) {
        window.clearTimeout(timer);
        resolve(browser.YT);
      }
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timer);
        script.remove();
        pending = null;
        reject(new Error("YouTube API unavailable"));
      };
      document.head.appendChild(script);
    }
  });
  return pending;
}
