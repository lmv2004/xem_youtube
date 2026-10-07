// Shared watch-party helpers. Safe to import from both server and client:
// no Prisma, no server-only imports.

/**
 * How far a viewer may drift from the room before we hard-seek them.
 * Below this we leave playback alone — constant micro-seeks are far more
 * jarring than being a second off.
 */
export const DRIFT_TOLERANCE_SECONDS = 2.5;

/**
 * A member is dropped after missing several polls in a row. Generous enough
 * to survive one slow request, short enough that the list stays believable.
 */
export const PRESENCE_TIMEOUT_MS = 60_000;

export const MAX_MESSAGE_LENGTH = 500;
export const MESSAGE_PAGE_SIZE = 50;
export const ROOM_CODE_LENGTH = 6;
export const MAX_NAME_LENGTH = 40;

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

/** A distinct connection identity for each mounted room/tab. */
export function createClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function guestDisplayName(): string {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  const suffix = (((bytes[0] << 8) | bytes[1]) % 9000) + 1000;
  return "Khách " + suffix;
}

export function sanitizeDisplayName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
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

export type PlaybackActionKind = "play" | "pause" | "seek" | "video";

export type RoomPlayback = {
  isPlaying: boolean;
  positionSeconds: number;
  /** ISO timestamp the position was measured at. */
  lastSyncAt: string;
  /** Display name of whoever last changed playback. */
  lastActionBy: string | null;
  /** clientId of that actor, used to ignore your own echo. */
  lastActionById: string | null;
  lastActionKind: PlaybackActionKind | null;
};

export type RoomMemberDto = {
  clientId: string;
  name: string;
  image: string | null;
  isHost: boolean;
  isGuest: boolean;
  joinedAt: string;
};

export type RoomDto = {
  code: string;
  title: string;
  host: { id: string; name: string | null; image: string | null };
  video: RoomVideo;
  playback: RoomPlayback;
  /** When true, only the host may drive playback. */
  hostOnlyControl: boolean;
  createdAt: string;
};

export type RoomMessageDto = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
};

export type RoomSyncResponse = {
  queue: RoomQueueItem[];
  playbackGeneration: number;
  revision: string;
  playback: RoomPlayback;
  video: RoomVideo;
  messages: RoomMessageDto[];
  members: RoomMemberDto[];
  hostOnlyControl: boolean;
  /** Pass back as `after` on the next poll. */
  cursor: string | null;
  serverTime: string;
};

export type RoomQueueItem = RoomVideo & { id: string };
export type RoomPlaybackUpdate = Pick<
  RoomSyncResponse,
  | "playback"
  | "video"
  | "hostOnlyControl"
  | "serverTime"
  | "revision"
  | "queue"
  | "playbackGeneration"
>;

/**
 * Single source of truth for "may this person drive playback?", shared by the
 * API and the UI so a disabled button and a rejected request can never
 * disagree.
 */
export function canControlPlayback(opts: {
  hostOnlyControl: boolean;
  isHost: boolean;
}): boolean {
  return !opts.hostOnlyControl || opts.isHost;
}

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
  opts: { now?: number; serverTime?: string; receivedAt?: number } = {},
): number {
  if (!playback.isPlaying) return Math.max(0, playback.positionSeconds);

  const now = opts.now ?? Date.now();
  const reference = opts.serverTime ? Date.parse(opts.serverTime) : now;
  const anchored = Date.parse(playback.lastSyncAt);
  if (Number.isNaN(anchored) || Number.isNaN(reference)) {
    return Math.max(0, playback.positionSeconds);
  }

  const elapsed =
    (reference + (opts.receivedAt ? now - opts.receivedAt : 0) - anchored) /
    1000;
  return Math.max(0, playback.positionSeconds + elapsed);
}

/** Human sentence for the activity line under the player. */
export function describeAction(
  playback: RoomPlayback,
  t: (key: string, params?: Record<string, string | number>) => string = (
    key,
    params,
  ) => key.replace("{name}", String(params?.name ?? "")),
): string | null {
  if (!playback.lastActionBy || !playback.lastActionKind) return null;
  const who = playback.lastActionBy;
  switch (playback.lastActionKind) {
    case "play":
      return t("{name} đã phát video", { name: who });
    case "pause":
      return t("{name} đã tạm dừng", { name: who });
    case "seek":
      return t("{name} đã tua video", { name: who });
    case "video":
      return t("{name} đã đổi video", { name: who });
    default:
      return null;
  }
}

/** Extracts a YouTube video id from an embed URL, tolerating query strings. */
export function videoIdFromEmbedUrl(embedUrl: string): string | null {
  const match = embedUrl.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : null;
}
