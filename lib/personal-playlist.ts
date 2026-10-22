import { normalizeWatchLater } from "./local-library";
import type { VideoItem } from "./types";

export const PLAYLIST_STORAGE_KEY = "xemphim:personal-playlists:v1";
export const MAX_PERSONAL_PLAYLIST_ITEMS = 500;
const PLAYLIST_ID = /^[a-zA-Z0-9-]{16,64}$/;

export type PersonalPlaylist = {
  id: string;
  title: string;
  items: VideoItem[];
  order: string[];
  shuffled: boolean;
  repeat: boolean;
  ownerId?: string;
};

/** Snapshots are bounded, contain canonical video URLs, and never enter shared URLs. */
export function normalizePersonalPlaylist(value: unknown): PersonalPlaylist | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string" || !PLAYLIST_ID.test(candidate.id)) return null;
  const items: VideoItem[] = [];
  const seen = new Set<string>();
  if (Array.isArray(candidate.items)) {
    for (const value of candidate.items.slice(0, MAX_PERSONAL_PLAYLIST_ITEMS)) {
      const item = normalizeWatchLater([value])[0];
      if (!item || !/^[A-Za-z0-9_-]{11}$/.test(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      // Playback only needs the small card metadata. Avoid retaining descriptions.
      items.push({ ...item, description: "" });
    }
  }
  if (!items.length) return null;
  const order = Array.isArray(candidate.order)
    ? candidate.order.filter((id): id is string => typeof id === "string" && seen.has(id))
    : [];
  const validOrder = order.length === items.length && new Set(order).size === items.length;
  return {
    id: candidate.id,
    title: typeof candidate.title === "string" ? candidate.title.trim().slice(0, 160) : "",
    items,
    order: validOrder ? order : items.map((item) => item.id),
    shuffled: candidate.shuffled === true && validOrder,
    repeat: candidate.repeat === true,
    ...(typeof candidate.ownerId === "string" && candidate.ownerId.length <= 191
      ? { ownerId: candidate.ownerId }
      : {}),
  };
}

export function playlistIndex(playlist: PersonalPlaylist, videoId: string): number {
  return playlist.order.indexOf(videoId);
}

export function canAccessPersonalPlaylist(playlist: PersonalPlaylist, viewerId?: string): boolean {
  return !playlist.ownerId || playlist.ownerId === viewerId;
}

export function adjacentPlaylistVideo(
  playlist: PersonalPlaylist,
  currentId: string,
  direction: -1 | 1,
): string | null {
  const index = playlistIndex(playlist, currentId);
  if (index < 0) return null;
  const next = index + direction;
  if (next >= 0 && next < playlist.order.length) return playlist.order[next];
  return playlist.repeat
    ? playlist.order[(next + playlist.order.length) % playlist.order.length]
    : null;
}

/** Shuffle only the remaining videos, so the current video and played prefix stay put. */
export function togglePlaylistShuffle(
  playlist: PersonalPlaylist,
  currentId: string,
  random: () => number = Math.random,
): PersonalPlaylist {
  if (playlist.shuffled)
    return { ...playlist, shuffled: false, order: playlist.items.map((item) => item.id) };
  const index = playlistIndex(playlist, currentId);
  if (index < 0) return playlist;
  const remaining = playlist.order.slice(index + 1);
  for (let i = remaining.length - 1; i > 0; i--) {
    const sample = random();
    const j = Math.floor(Math.max(0, Math.min(0.999999999, Number.isFinite(sample) ? sample : 0)) * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return { ...playlist, shuffled: true, order: [...playlist.order.slice(0, index + 1), ...remaining] };
}

export function personalPlaylistHref(playlist: PersonalPlaylist, videoId: string, fromStart = true): string {
  const index = playlistIndex(playlist, videoId);
  if (index < 0) return `/watch/${encodeURIComponent(videoId)}`;
  const params = new URLSearchParams({ playlist: playlist.id, index: String(index) });
  if (fromStart) params.set("t", "0");
  return `/watch/${videoId}?${params}`;
}

/** Browser-only queue context must never leak into a link sent to somebody else. */
export function standaloneVideoUrl(href: string): string {
  const url = new URL(href);
  url.searchParams.delete("playlist");
  url.searchParams.delete("index");
  return url.toString();
}

/** A synchronous claim prevents repeated ended events from skipping several videos. */
export function createPlaylistAdvanceGuard() {
  let claimed = false;
  return {
    claim() {
      if (claimed) return false;
      claimed = true;
      return true;
    },
    reset() { claimed = false; },
  };
}
