// Server-only YouTube Data API v3 helper with pagination + filter support.
//
// This lives next to `lib/youtube.ts` rather than modifying it: the original
// module is imported by several routes that expect its exact signatures, so
// adding paging there would be a breaking change. Everything here is
// self-contained.
import "server-only";
import type { ErrorCode, VideoItem } from "./types";
import type { DurationFilter, SortOrder } from "./filters";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const SEARCH_ENDPOINT = API_BASE + "/search";
const VIDEOS_ENDPOINT = API_BASE + "/videos";
const DEFAULT_TIMEOUT_MS = 8000;

export const PAGE_SIZE = 12;

type YouTubeError = { code: ErrorCode; message: string };

function fail(code: ErrorCode, message: string): never {
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
  return key as string;
}

function parseDurationSeconds(iso: string | undefined): number {
  if (!iso) return 0;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const [, h = "0", m = "0", s = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

type Snippet = {
  title?: string;
  channelTitle?: string;
  publishedAt?: string;
  description?: string;
  thumbnails?: Record<string, { url?: string }>;
};

type SearchListItem = { id?: { videoId?: string }; snippet?: Snippet };

type VideosListItem = {
  id?: string;
  statistics?: { viewCount?: string };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean };
  snippet?: Snippet;
};

function pickThumbnail(snip: Snippet | undefined): string {
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

function toVideoItem(
  id: string,
  snip: Snippet | undefined,
  detail: VideosListItem | undefined,
): VideoItem {
  return {
    id,
    title: snip?.title ?? "Không rõ tiêu đề",
    channel: snip?.channelTitle ?? "Không rõ kênh",
    publishedAt: snip?.publishedAt ?? "",
    description: snip?.description ?? "",
    thumbnail: pickThumbnail(snip),
    embedUrl: "https://www.youtube.com/embed/" + id,
    watchUrl: "https://www.youtube.com/watch?v=" + id,
    durationSeconds: parseDurationSeconds(detail?.contentDetails?.duration),
    viewCount: Number(detail?.statistics?.viewCount ?? 0),
    embeddable: detail?.status?.embeddable !== false,
  };
}

export type PagedVideos = {
  items: VideoItem[];
  nextPageToken: string | null;
};

export type SearchOptions = {
  pageToken?: string | null;
  order?: SortOrder;
  duration?: DurationFilter;
  publishedAfter?: string | null;
  maxResults?: number;
};

// Hydrates search results with statistics/contentDetails in a single
// videos.list call, preserving the original relevance order.
async function hydrate(ids: string[], searchItems: SearchListItem[], key: string) {
  const videosUrl = new URL(VIDEOS_ENDPOINT);
  videosUrl.searchParams.set("part", "statistics,contentDetails,snippet,status");
  videosUrl.searchParams.set("id", ids.join(","));
  videosUrl.searchParams.set("key", key);

  const res = await fetchWithTimeout(videosUrl.toString(), DEFAULT_TIMEOUT_MS);
  if (!res.ok) {
    fail("upstream-error", "YouTube từ chối yêu cầu chi tiết video (HTTP " + res.status + ").");
  }
  const json = (await res.json()) as {
    items?: VideosListItem[];
    error?: { message?: string };
  };
  if (json.error) {
    fail("upstream-error", json.error.message ?? "Lỗi không xác định từ YouTube.");
  }

  const detailById = new Map<string, VideosListItem>();
  for (const v of json.items ?? []) {
    if (v.id) detailById.set(v.id, v);
  }

  return ids.map((id, idx) => {
    const detail = detailById.get(id);
    const snip = searchItems[idx]?.snippet ?? detail?.snippet;
    return toVideoItem(id, snip, detail);
  });
}

// Paginated keyword search. Unlike the legacy `searchVideos()` helper this one
// preserves YouTube's own ordering (so `order=date` actually means "newest")
// instead of re-sorting client results by view count.
export async function searchVideosPaged(
  query: string,
  opts: SearchOptions = {},
): Promise<PagedVideos> {
  const key = ensureKey();

  const searchUrl = new URL(SEARCH_ENDPOINT);
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", String(opts.maxResults ?? PAGE_SIZE));
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("relevanceLanguage", "vi");
  searchUrl.searchParams.set("safeSearch", "none");
  searchUrl.searchParams.set("order", opts.order ?? "relevance");
  if (opts.duration && opts.duration !== "any") {
    searchUrl.searchParams.set("videoDuration", opts.duration);
  }
  if (opts.publishedAfter) {
    searchUrl.searchParams.set("publishedAfter", opts.publishedAfter);
  }
  if (opts.pageToken) searchUrl.searchParams.set("pageToken", opts.pageToken);
  searchUrl.searchParams.set("key", key);

  const res = await fetchWithTimeout(searchUrl.toString(), DEFAULT_TIMEOUT_MS);
  if (!res.ok) {
    fail("upstream-error", "YouTube từ chối yêu cầu tìm kiếm (HTTP " + res.status + ").");
  }
  const json = (await res.json()) as {
    items?: SearchListItem[];
    nextPageToken?: string;
    error?: { message?: string };
  };
  if (json.error) {
    fail("upstream-error", json.error.message ?? "Lỗi không xác định từ YouTube.");
  }

  const searchItems = json.items ?? [];
  const ids = searchItems
    .map((it) => it.id?.videoId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (ids.length === 0) {
    return { items: [], nextPageToken: json.nextPageToken ?? null };
  }

  const items = await hydrate(ids, searchItems, key);
  return { items, nextPageToken: json.nextPageToken ?? null };
}

// Paginated "most popular" chart. The chart endpoint ignores order/duration/
// publishedAfter, so those filters are applied in-memory by the caller.
export async function listTrendingPaged(
  regionCode: string,
  opts: SearchOptions = {},
): Promise<PagedVideos> {
  const key = ensureKey();

  const url = new URL(VIDEOS_ENDPOINT);
  url.searchParams.set("part", "statistics,contentDetails,snippet,status");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", regionCode.slice(0, 2).toUpperCase());
  url.searchParams.set("maxResults", String(opts.maxResults ?? PAGE_SIZE));
  if (opts.pageToken) url.searchParams.set("pageToken", opts.pageToken);
  url.searchParams.set("key", key);

  const res = await fetchWithTimeout(url.toString(), DEFAULT_TIMEOUT_MS);
  if (!res.ok) {
    fail("upstream-error", "YouTube từ chối yêu cầu trending (HTTP " + res.status + ").");
  }
  const json = (await res.json()) as {
    items?: VideosListItem[];
    nextPageToken?: string;
    error?: { message?: string };
  };
  if (json.error) {
    fail("upstream-error", json.error.message ?? "Lỗi không xác định từ YouTube.");
  }

  const items = (json.items ?? [])
    .filter((v): v is VideosListItem & { id: string } => typeof v.id === "string")
    .map((v) => toVideoItem(v.id, v.snippet, v));

  return { items, nextPageToken: json.nextPageToken ?? null };
}
