import {
  normalizePersonalPlaylist,
  PLAYLIST_STORAGE_KEY,
  type PersonalPlaylist,
} from "./personal-playlist";

let memory: PersonalPlaylist[] = [];
let unpersisted = false;

export function readPersonalPlaylist(id: string): PersonalPlaylist | null {
  if (typeof window === "undefined") return null;
  if (!unpersisted) {
    try {
      const raw: unknown = JSON.parse(window.sessionStorage.getItem(PLAYLIST_STORAGE_KEY) ?? "[]");
      memory = Array.isArray(raw)
        ? raw.slice(0, 5).map(normalizePersonalPlaylist).filter((item): item is PersonalPlaylist => item !== null)
        : [];
    } catch {
      // Same-tab playback still works when browser storage is blocked.
    }
  }
  return memory.find((item) => item.id === id) ?? null;
}

export function savePersonalPlaylist(playlist: PersonalPlaylist): boolean {
  readPersonalPlaylist(playlist.id);
  memory = [playlist, ...memory.filter((item) => item.id !== playlist.id)].slice(0, 5);
  try {
    window.sessionStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(memory));
    unpersisted = false;
    return true;
  } catch {
    unpersisted = true;
    return false;
  }
}

export function hasUnpersistedPlaylist(): boolean { return unpersisted; }
