import { extractYouTubeId } from "./youtube-url";

// Match the input's native maxlength, measured in UTF-16 code units.
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 500;
export const MAX_SEARCH_INTERESTS = 4;
export const SEARCH_INTEREST_MAX_LENGTH = 100;

export type VideoSearchQuery = {
  topic: string;
  interests: string[];
  query: string;
  label: string;
};

/** Validate first: never send a silently shortened query to YouTube. */
export function parseVideoSearchQuery(
  rawTopic: string,
  rawInterests: string | null,
): VideoSearchQuery | null {
  const topic = rawTopic.trim();
  const interests = (rawInterests ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    (topic.length > 0 && topic.length < SEARCH_MIN_LENGTH) ||
    topic.length > SEARCH_MAX_LENGTH ||
    interests.length > MAX_SEARCH_INTERESTS ||
    interests.some((value) => value.length > SEARCH_INTEREST_MAX_LENGTH)
  ) {
    return null;
  }
  const validInterests = interests.filter(
    (value) => value.length >= SEARCH_MIN_LENGTH,
  );
  const parts = [...validInterests];
  if (topic.length >= SEARCH_MIN_LENGTH) parts.push(topic);
  return {
    topic,
    interests: validInterests,
    query: parts.join(" | "),
    label: parts.join(", "),
  };
}

export type SearchDestination = {
  href: string;
  // Video URLs and IDs are navigation, not public keyword searches.
  keyword: string | null;
};

/** The palette, header and home search all use the same URL-driven navigation. */
export function getSearchDestination(value: string): SearchDestination | null {
  const term = value.trim();
  if (term.length < SEARCH_MIN_LENGTH || term.length > SEARCH_MAX_LENGTH)
    return null;
  const id = extractYouTubeId(term);
  return id
    ? { href: `/watch/${id}`, keyword: null }
    : { href: `/?${new URLSearchParams({ topic: term })}`, keyword: term };
}
