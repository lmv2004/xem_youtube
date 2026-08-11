// Shared watch-party helpers. Safe to import from both server and client:
// no Prisma, no server-only imports.

export const SYNC_INTERVAL_MS = 2000;

/**
 * How far a viewer may drift from the host before we hard-seek them.
 * Below this we leave playback alone — constant micro-seeks are far more
 * jarring than being a second off.
 */
export const DRIFT_TOLERANCE_SECONDS = 2.5;

export const MAX_MESSAGE_LENGTH = 500;
export const MESSAGE_PAGE_SIZE = 50;
export const ROOM_CODE_LENGTH = 6;

// Ambiguous glyphs (0/O, 1/I/L) removed so codes can be read aloud.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Generates a short, human-friendly room code. */
export function generateRoomCode(length = ROOM_CODE_LENGTH): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export type RoomVideo = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  embedUrl: string;
  watchUrl: string;
  duration: number;
};

export type RoomPlayback = {
  isPlaying: boolean;
  positionSeconds: number;
  /** ISO timestamp the position was measured at. */
  lastSyncAt: string;
};

export type RoomDto = {
  code: string;
  title: string;
  host: { id: string; name: string | null; image: string | null };
  video: RoomVideo;
  playback: RoomPlayback;
  createdAt: string;
};

export type RoomMessageDto = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
};

export type RoomSyncResponse = {
  playback: RoomPlayback;
  video: RoomVideo;
  messages: RoomMessageDto[];
  /** Pass back as `after` on the next poll. */
  cursor: string | null;
  serverTime: string;
};

/**
 * Position the room *should* be at right now.
 *
 * While playing, the stored position is only an anchor — real elapsed time
 * since `lastSyncAt` has to be added. While paused the anchor is exact.
 *
 * `serverTime` lets callers correct for clock skew between the browser and
 * the server; without it a device with a wrong clock would seek endlessly.
 */
export function effectivePosition(
  playback: RoomPlayback,
  opts: { now?: number; serverTime?: string } = {},
): number {
  if (!playback.isPlaying) return Math.max(0, playback.positionSeconds);

  const now = opts.now ?? Date.now();
  const reference = opts.serverTime ? Date.parse(opts.serverTime) : now;
  const anchored = Date.parse(playback.lastSyncAt);
  if (Number.isNaN(anchored) || Number.isNaN(reference)) {
    return Math.max(0, playback.positionSeconds);
  }

  const skew = now - reference;
  const elapsed = (now - skew - anchored) / 1000;
  return Math.max(0, playback.positionSeconds + elapsed);
}

/** Extracts a YouTube video id from an embed URL, tolerating query strings. */
export function videoIdFromEmbedUrl(embedUrl: string): string | null {
  const match = embedUrl.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : null;
}
