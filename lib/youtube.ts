// Server-only YouTube Data API v3 helper.
// Reads YOUTUBE_API_KEY from process.env; never imported by client code.
import "server-only";
import type { ErrorCode, VideoItem } from "./types";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const SEARCH_ENDPOINT = `${API_BASE}/search`;
const VIDEOS_ENDPOINT = `${API_BASE}/videos`;
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RESULTS = 12;

type YouTubeError = { code: ErrorCode; message: string };

function isYouTubeError(value: unknown): value is YouTubeError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof (value as { code: unknown }).code === "string" &&
    typeof (value as { message: unknown }).message === "string"
  );
}

// Throws a structured error consumed by the route handler.
function fail(code: ErrorCode, message: string): never {
  // We throw an Error with attached fields; route handler reads them via a guard.
  const err = new Error(message) as Error & YouTubeError;
  err.code = code;
  err.message = message;
  throw err;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      fail("timeout", "Yêu cầu tới YouTube quá thời gian. Vui lòng thử lại.");
    }
    fail("network", "Không thể kết nối tới YouTube. Kiểm tra mạng và thử lại.");
  } finally {
    clearTimeout(timer);
  }
}

function ensureKey(): string {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) fail("missing-key", "Chưa cấu hình YOUTUBE_API_KEY trên máy chủ.");
  return key!;
}

// Parse ISO-8601 duration (PT#H#M#S) → seconds. Returns 0 on malformed input.
export function parseDurationSeconds(iso: string | undefined): number {
  if (!iso) return 0;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const [, h = "0", m = "0", s = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

export function formatViews(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "—";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M lượt xem`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K lượt xem`;
  return `${count} lượt xem`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

type SearchListItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    description?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
};

type VideosListItem = {
  id?: string;
  statistics?: { viewCount?: string };
  contentDetails?: { duration?: string };
  status?: {
    embeddable?: boolean;
    publicStatsViewable?: boolean;
    uploadStatus?: "deleted" | "failed" | "processed" | "rejected" | "uploaded";
    privacyStatus?: "private" | "public" | "unlisted";
  };
  contentRating?: { ytRating?: string };
  regionRestriction?: {
    allowed?: string[];
    blocked?: string[];
  };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    description?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
};

export type DroppedVideo = {
  id: string;
  reason:
    | "not-embeddable"
    | "private"
    | "deleted"
    | "region-blocked"
    | "age-restricted";
};

function classifyReason(v: VideosListItem): DroppedVideo["reason"] | null {
  const status = v.status;
  if (!status) return null; // we don't have rich data; assume playable
  if (status.privacyStatus === "private") return "private";
  if (status.uploadStatus === "deleted" || status.uploadStatus === "failed") return "deleted";
  if (status.embeddable === false) return "not-embeddable";
  return null;
}

function isRegionAllowed(v: VideosListItem, region: string | undefined): DroppedVideo["reason"] | null {
  if (!region) return null;
  const blocked = v.regionRestriction?.blocked;
  if (blocked && blocked.length > 0 && blocked.includes(region.toUpperCase())) {
    return "region-blocked";
  }
  return null;
}

function pickThumbnail(snip: SearchListItem["snippet"]): string {
  const thumbs = snip?.thumbnails;
  if (!thumbs) return "";
  return (
    thumbs.maxres?.url ||
    thumbs.standard?.url ||
    thumbs.high?.url ||
    thumbs.medium?.url ||
    thumbs.default?.url ||
    ""
  );
}

// Public entry point. Topic must be already validated by the caller.
export async function searchVideos(topic: string): Promise<VideoItem[]> {
  const key = ensureKey();

  const searchUrl = new URL(SEARCH_ENDPOINT);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", String(MAX_RESULTS));
  searchUrl.searchParams.set("q", topic);
  searchUrl.searchParams.set("relevanceLanguage", "vi");
  searchUrl.searchParams.set("safeSearch", "none");
  searchUrl.searchParams.set("key", key);

  const searchRes = await fetchWithTimeout(searchUrl.toString(), DEFAULT_TIMEOUT_MS);
  if (!searchRes.ok) {
    fail("upstream-error", `YouTube từ chối yêu cầu tìm kiếm (HTTP ${searchRes.status}).`);
  }
  const searchJson = (await searchRes.json()) as {
    items?: SearchListItem[];
    error?: { message?: string; code?: number };
  };
  if (searchJson.error) {
    fail("upstream-error", searchJson.error.message ?? "Lỗi không xác định từ YouTube.");
  }

  const ids: string[] = (searchJson.items ?? [])
    .map((it) => it.id?.videoId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  if (ids.length === 0) return [];

  const videosUrl = new URL(VIDEOS_ENDPOINT);
  videosUrl.searchParams.set("part", "statistics,contentDetails,snippet,status");
  videosUrl.searchParams.set("id", ids.join(","));
  videosUrl.searchParams.set("key", key);

  const videosRes = await fetchWithTimeout(videosUrl.toString(), DEFAULT_TIMEOUT_MS);
  if (!videosRes.ok) {
    fail("upstream-error", `YouTube từ chối yêu cầu chi tiết video (HTTP ${videosRes.status}).`);
  }
  const videosJson = (await videosRes.json()) as {
    items?: VideosListItem[];
    error?: { message?: string; code?: number };
  };
  if (videosJson.error) {
    fail("upstream-error", videosJson.error.message ?? "Lỗi không xác định từ YouTube.");
  }

  const detailById = new Map<string, VideosListItem>();
  for (const v of videosJson.items ?? []) {
    if (v.id) detailById.set(v.id, v);
  }

  // Build a stable order: search relevance preserved, but tie-break by viewCount desc.
  const items: VideoItem[] = ids
    .map((id, idx): VideoItem | null => {
      const searchItem = (searchJson.items ?? [])[idx];
      const detail = detailById.get(id);
      const snip = searchItem?.snippet ?? detail?.snippet;
      if (!snip) return null;
      const title = snip.title ?? "Không rõ tiêu đề";
      const channel = snip.channelTitle ?? "Không rõ kênh";
      const publishedAt = snip.publishedAt ?? "";
      const description = snip.description ?? "";
      const thumbnail = pickThumbnail(snip);
      const viewCount = Number(detail?.statistics?.viewCount ?? 0);
      const durationSeconds = parseDurationSeconds(detail?.contentDetails?.duration);
      const embeddable = detail?.status?.embeddable !== false ? true : false;
      return {
        id,
        title,
        channel,
        publishedAt,
        description,
        thumbnail,
        embedUrl: `https://www.youtube.com/embed/${id}`,
        watchUrl: `https://www.youtube.com/watch?v=${id}`,
        durationSeconds,
        viewCount,
        embeddable,
      };
    })
    .filter((v): v is VideoItem => v !== null);

  // Sort by viewCount desc, falling back to search order when viewCount is 0.
  items.sort((a, b) => b.viewCount - a.viewCount);
  return items;
}

// Helper for the route handler so the consumer doesn't import "server-only".
export function isStructuredError(e: unknown): e is Error & YouTubeError {
  if (!(e instanceof Error)) return false;
  return isYouTubeError(e);
}

// Fetch a single video by id via YouTube Data API videos.list. Returns null
// when the id is unknown, removed, or the payload is empty. Mirrors the
// shape returned by searchVideos() and listTrending() so callers can use
// any VideoItem interchangeably.
export async function getVideoById(id: string): Promise<VideoItem | null> {
  const key = ensureKey();
  const cleanId = id.trim();
  if (!cleanId) return null;

  const url = new URL(VIDEOS_ENDPOINT);
  url.searchParams.set("part", "statistics,contentDetails,snippet,status");
  url.searchParams.set("id", cleanId);
  url.searchParams.set("key", key);

  const res = await fetchWithTimeout(url.toString(), DEFAULT_TIMEOUT_MS);
  if (!res.ok) {
    fail("upstream-error", `YouTube từ chối yêu cầu video (HTTP ${res.status}).`);
  }
  const json = (await res.json()) as {
    items?: VideosListItem[];
    error?: { message?: string; code?: number };
  };
  if (json.error) {
    fail("upstream-error", json.error.message ?? "Lỗi không xác định từ YouTube.");
  }
  const v = (json.items ?? [])[0];
  if (!v || !v.id) return null;

  const snip = v.snippet;
  const title = snip?.title ?? "Không rõ tiêu đề";
  const channel = snip?.channelTitle ?? "Không rõ kênh";
  const publishedAt = snip?.publishedAt ?? "";
  const description = snip?.description ?? "";
  const thumbnail = pickThumbnail(snip);
  const viewCount = Number(v.statistics?.viewCount ?? 0);
  const durationSeconds = parseDurationSeconds(v.contentDetails?.duration);
  const embeddable = v.status?.embeddable !== false ? true : false;

  return {
    id: v.id,
    title,
    channel,
    publishedAt,
    description,
    thumbnail,
    embedUrl: `https://www.youtube.com/embed/${v.id}`,
    watchUrl: `https://www.youtube.com/watch?v=${v.id}`,
    durationSeconds,
    viewCount,
    embeddable,
  };
}

// Fetches most-popular videos for a region (no query required).
// Returns a normalized list of VideoItem, matching `searchVideos()` shape.
export async function listTrending(regionCode: string, maxResults = MAX_RESULTS): Promise<VideoItem[]> {
  const key = ensureKey();

  const url = new URL(VIDEOS_ENDPOINT);
  url.searchParams.set("part", "statistics,contentDetails,snippet,status");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", regionCode.slice(0, 2).toUpperCase());
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", key);

  const res = await fetchWithTimeout(url.toString(), DEFAULT_TIMEOUT_MS);
  if (!res.ok) {
    fail("upstream-error", `YouTube từ chối yêu cầu trending (HTTP ${res.status}).`);
  }
  const json = (await res.json()) as {
    items?: VideosListItem[];
    error?: { message?: string; code?: number };
  };
  if (json.error) {
    fail("upstream-error", json.error.message ?? "Lỗi không xác định từ YouTube.");
  }

  const items: VideoItem[] = (json.items ?? [])
    .map((v): VideoItem | null => {
      if (!v.id) return null;
      const snip = v.snippet;
      const title = snip?.title ?? "Không rõ tiêu đề";
      const channel = snip?.channelTitle ?? "Không rõ kênh";
      const publishedAt = snip?.publishedAt ?? "";
      const description = snip?.description ?? "";
      const thumbnail = pickThumbnail(snip);
      const viewCount = Number(v.statistics?.viewCount ?? 0);
      const durationSeconds = parseDurationSeconds(v.contentDetails?.duration);
      const embeddable = v.status?.embeddable !== false ? true : false;
      return {
        id: v.id,
        title,
        channel,
        publishedAt,
        description,
        thumbnail,
        embedUrl: `https://www.youtube.com/embed/${v.id}`,
        watchUrl: `https://www.youtube.com/watch?v=${v.id}`,
        durationSeconds,
        viewCount,
        embeddable,
      };
    })
    .filter((v): v is VideoItem => v !== null);

  items.sort((a, b) => b.viewCount - a.viewCount);
  return items;
}
