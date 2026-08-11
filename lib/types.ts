// Shared types for the YouTube Trending Explorer.
// Kept dependency-free so both server and client can import.

export type VideoItem = {
  id: string;
  title: string;
  channel: string;
  publishedAt: string; // ISO-8601
  description: string;
  thumbnail: string; // https URL to a 16:9 thumbnail
  embedUrl: string; // https://www.youtube.com/embed/{id}
  watchUrl: string; // canonical YouTube watch URL
  durationSeconds: number; // parsed from ISO-8601 duration, 0 if unknown
  viewCount: number; // 0 when missing
  embeddable?: boolean; // true if YouTube allows embed; false → user must open YouTube
};

export type VideoSearchResponse = {
  topic: string;
  items: VideoItem[];
  featuredId: string | null;
  // Opaque cursor returned by the YouTube Data API. Null/absent when the
  // current result set has no further pages.
  nextPageToken?: string | null;
  error?: { code: ErrorCode; message: string };
};

export type ErrorCode =
  | "missing-key"
  | "invalid-topic"
  | "upstream-error"
  | "network"
  | "timeout"
  | "no-results";

export type SearchStatus =
  | { kind: "idle" }
  | { kind: "loading"; topic: string }
  | { kind: "ready"; topic: string; items: VideoItem[]; featuredId: string | null }
  | { kind: "empty"; topic: string }
  | { kind: "error"; topic: string; code: ErrorCode; message: string }
  | { kind: "missing-key" };
