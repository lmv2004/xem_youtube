import type { VideoItem } from "./types";

export const WATCH_PROGRESS_KEY = "xemphim:watch-progress:v1";
export const WATCH_PROGRESS_EVENT = "xemphim:watch-progress:change";
const MAX_ENTRIES = 30;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export type WatchProgress = {
  video: VideoItem;
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: number;
};

/** Shared links accept seconds or YouTube's familiar 1h2m3s notation. */
export function parseWatchTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (/^\d+(?:\.\d+)?$/.test(value))
    return Math.min(604800, Math.floor(Number(value)));
  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i.exec(value);
  if (!parts || !parts[0]) return null;
  return Math.min(
    604800,
    Number(parts[1] ?? 0) * 3600 +
      Number(parts[2] ?? 0) * 60 +
      Number(parts[3] ?? 0),
  );
}

export function timestampShareUrl(href: string, seconds: number): string {
  const url = new URL(href);
  url.searchParams.delete("start");
  url.hash = "";
  url.searchParams.set(
    "t",
    String(Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))),
  );
  return url.toString();
}

export function decodeWatchProgress(raw: string | null): WatchProgress[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is WatchProgress => {
        if (!entry || typeof entry !== "object") return false;
        const { video, positionSeconds, durationSeconds, updatedAt } = entry;
        return (
          video &&
          typeof video === "object" &&
          typeof video.id === "string" &&
          VIDEO_ID.test(video.id) &&
          [
            "title",
            "channel",
            "thumbnail",
            "description",
            "publishedAt",
            "embedUrl",
            "watchUrl",
          ].every((key) => typeof video[key] === "string") &&
          Number.isFinite(video.durationSeconds) &&
          Number.isFinite(video.viewCount) &&
          Number.isFinite(positionSeconds) &&
          positionSeconds >= 5 &&
          Number.isFinite(durationSeconds) &&
          durationSeconds > positionSeconds &&
          Number.isFinite(updatedAt) &&
          updatedAt > 0
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function updateWatchProgress(
  entries: WatchProgress[],
  entry: WatchProgress,
): WatchProgress[] {
  const rest = entries.filter((item) => item.video.id !== entry.video.id);
  // Finished videos and live streams should not keep reappearing as unfinished.
  if (
    !Number.isFinite(entry.durationSeconds) ||
    entry.durationSeconds <= 0 ||
    !Number.isFinite(entry.positionSeconds) ||
    entry.positionSeconds < 5 ||
    entry.positionSeconds / entry.durationSeconds >= 0.95 ||
    entry.durationSeconds - entry.positionSeconds <= 10
  )
    return rest;
  return [entry, ...rest].slice(0, MAX_ENTRIES);
}

export function readWatchProgress(): WatchProgress[] {
  if (typeof window === "undefined") return [];
  try {
    return decodeWatchProgress(window.localStorage.getItem(WATCH_PROGRESS_KEY));
  } catch {
    return [];
  }
}

export function saveWatchProgress(
  video: VideoItem,
  positionSeconds: number,
  durationSeconds: number,
) {
  try {
    const entries = updateWatchProgress(readWatchProgress(), {
      video,
      positionSeconds,
      durationSeconds,
      updatedAt: Date.now(),
    });
    window.localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(entries));
    window.dispatchEvent(new Event(WATCH_PROGRESS_EVENT));
  } catch {
    /* Playback remains usable when browser storage is unavailable. */
  }
}

export function removeWatchProgress(id: string) {
  try {
    window.localStorage.setItem(
      WATCH_PROGRESS_KEY,
      JSON.stringify(
        readWatchProgress().filter((entry) => entry.video.id !== id),
      ),
    );
    window.dispatchEvent(new Event(WATCH_PROGRESS_EVENT));
  } catch {
    /* Storage may be disabled. */
  }
}
