import { extractYouTubeId } from "./youtube-url";
import type { VideoItem } from "./types";

/** Valid links remain queueable even when all metadata services are unavailable. */
export function youtubeLinkVideo(input: string): VideoItem | null {
  const id = extractYouTubeId(input);
  if (!id) return null;
  return {
    id,
    title: `YouTube · ${id}`,
    channel: "",
    publishedAt: "",
    description: "",
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    durationSeconds: 0,
    viewCount: 0,
  };
}

export async function resolveYouTubeLink(
  input: string,
  fetcher: typeof fetch = fetch,
): Promise<VideoItem | null> {
  const video = youtubeLinkVideo(input);
  if (!video) return null;
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", video.watchUrl);
  endpoint.searchParams.set("format", "json");
  try {
    const response = await fetcher(endpoint, {
      signal: AbortSignal.timeout(2000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) return video;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return video;
    const meta = data as Record<string, unknown>;
    return {
      ...video,
      title:
        typeof meta.title === "string" && meta.title.trim()
          ? meta.title.trim().slice(0, 300)
          : video.title,
      channel:
        typeof meta.author_name === "string"
          ? meta.author_name.trim().slice(0, 200)
          : "",
    };
  } catch {
    return video;
  }
}
