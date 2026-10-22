import type { Locale } from "./locale";
import { extractYouTubeId } from "./youtube-url";
import { SEARCH_MAX_LENGTH } from "./search-query";

export type SearchSuggestion = {
  term: string;
  source: "recent" | "popular" | "suggested";
};

// These are editorial starting points, not live popularity or search analytics.
const KEYWORDS: Record<Locale, readonly string[]> = {
  vi: [
    "nhạc lofi",
    "nhạc thư giãn",
    "nhạc Việt mới",
    "học tiếng Anh",
    "món ăn dễ làm",
    "du lịch Việt Nam",
    "hướng dẫn React",
    "tin công nghệ",
    "tập yoga tại nhà",
    "nhạc không lời",
    "lofi học bài",
    "React tutorial",
  ],
  en: [
    "lofi music",
    "relaxing music",
    "new music",
    "learn English",
    "easy recipes",
    "travel guides",
    "React tutorial",
    "technology news",
    "yoga at home",
    "instrumental music",
    "lofi study music",
    "science explained",
  ],
  te: [
    "తెలుగు పాటలు",
    "ప్రశాంతమైన సంగీతం",
    "కొత్త తెలుగు పాటలు",
    "ఇంగ్లీష్ నేర్చుకోండి",
    "సులభమైన వంటలు",
    "ప్రయాణ వీడియోలు",
    "React తెలుగు ట్యుటోరియల్",
    "టెక్నాలజీ వార్తలు",
    "ఇంట్లో యోగా",
    "పిల్లల కథలు",
    "lofi music",
    "React tutorial",
  ],
};

function cleanTerm(value: unknown): string {
  if (typeof value !== "string") return "";
  const term = value.trim().replace(/\s+/gu, " ");
  if (
    term.length < 2 ||
    term.length > SEARCH_MAX_LENGTH ||
    /[\u0000-\u001f\u007f]/u.test(term) ||
    !/[\p{L}\p{N}]/u.test(term)
  ) {
    return "";
  }
  return term;
}

function matchKey(value: string): string {
  return (
    value
      .normalize("NFD")
      // Only Latin combining accents are removed. Telugu vowel signs are meaningful.
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, "d")
      .normalize("NFC")
  );
}

function isVideoOrUrl(value: string): boolean {
  return (
    extractYouTubeId(value) !== null ||
    /^(?:[a-z][a-z\d+.-]*:\/\/|https?:|ftp:|file:|data:|javascript:|\/\/|www\.)/i.test(
      value,
    ) ||
    /^(?:[\p{L}\p{N}-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#]|$)/iu.test(value)
  );
}

function matchScore(term: string, query: string): number {
  if (!query || term.startsWith(query)) return 0;
  if (term.includes(query)) return 1;
  // Typing several words can still find a phrase when its word order differs.
  return query.split(" ").every((word) => term.includes(word)) ? 2 : Infinity;
}

/** Instant local suggestions; typing never consumes YouTube API quota. */
export function getSearchSuggestions(
  query: string,
  recent: string[],
  locale: Locale,
  limit = 6,
  popular: readonly string[] = [],
): SearchSuggestion[] {
  const count = Number.isFinite(limit)
    ? Math.max(0, Math.min(8, Math.floor(limit)))
    : 6;
  const cleanQuery = query.trim().replace(/\s+/gu, " ");
  if (!count || cleanQuery.length > SEARCH_MAX_LENGTH || isVideoOrUrl(cleanQuery))
    return [];
  const queryKey = matchKey(cleanQuery);
  const seen = new Set<string>();

  function candidates(
    values: readonly unknown[],
    source: SearchSuggestion["source"],
  ): SearchSuggestion[] {
    return values
      .map((value, index) => {
        const term = cleanTerm(value);
        const key = matchKey(term);
        const score = matchScore(key, queryKey);
        if (
          !term ||
          isVideoOrUrl(term) ||
          seen.has(key) ||
          !Number.isFinite(score)
        ) {
          return null;
        }
        seen.add(key);
        return { term, source, score, index };
      })
      .filter((item) => item !== null)
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .map(({ term, source }) => ({ term, source }));
  }

  const previous = candidates(recent, "recent");
  const trending = candidates(popular, "popular");
  const suggested = candidates(KEYWORDS[locale], "suggested");
  const discovery = [...trending, ...suggested];
  if (queryKey) return [...previous, ...discovery].slice(0, count);

  // Keep discovery visible even when a user has a full recent-search history.
  const recentCount = Math.min(previous.length, Math.ceil(count / 2));
  const results = [
    ...previous.slice(0, recentCount),
    ...discovery.slice(0, count - recentCount),
  ];
  return [...results, ...previous.slice(recentCount)].slice(0, count);
}
