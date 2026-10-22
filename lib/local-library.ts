import type { VideoItem } from "./types";
import { SEARCH_MAX_LENGTH } from "./search-query";

export const MAX_WATCH_LATER_ITEMS = 100;
export const MAX_RECENT_SEARCHES = 8;

function httpsUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

/** Keep the existing storage format while repairing old or damaged entries. */
export function normalizeWatchLater(value: unknown): VideoItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: VideoItem[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      !/^[\w-]{1,100}$/.test(item.id) ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      typeof item.channel !== "string" ||
      seen.has(item.id)
    )
      continue;
    seen.add(item.id);
    result.push({
      id: item.id,
      title: item.title.slice(0, 1000),
      channel: item.channel.slice(0, 500),
      publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : "",
      description:
        typeof item.description === "string"
          ? item.description.slice(0, 10000)
          : "",
      thumbnail: httpsUrl(item.thumbnail),
      embedUrl: `https://www.youtube.com/embed/${item.id}`,
      watchUrl: `https://www.youtube.com/watch?v=${item.id}`,
      durationSeconds:
        typeof item.durationSeconds === "number" &&
        Number.isFinite(item.durationSeconds)
          ? Math.max(0, item.durationSeconds)
          : 0,
      viewCount:
        typeof item.viewCount === "number" && Number.isFinite(item.viewCount)
          ? Math.max(0, item.viewCount)
          : 0,
      embeddable: item.embeddable !== false,
    });
    if (result.length === MAX_WATCH_LATER_ITEMS) break;
  }
  return result;
}

export function normalizeRecentSearches(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    const term = candidate.trim();
    const key = term.toLocaleLowerCase();
    if (term.length < 2 || term.length > SEARCH_MAX_LENGTH || seen.has(key))
      continue;
    seen.add(key);
    result.push(term);
    if (result.length === MAX_RECENT_SEARCHES) break;
  }
  return result;
}

export function moveWatchLater(
  items: VideoItem[],
  id: string,
  direction: -1 | 1,
): VideoItem[] {
  const from = items.findIndex((item) => item.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= items.length) return items;
  const result = [...items];
  [result[from], result[to]] = [result[to], result[from]];
  return result;
}
