import { NextResponse } from "next/server";
import { isStructuredError } from "@/lib/youtube";
import { listTrendingPaged, searchVideosPaged } from "@/lib/youtube-search";
import type { ErrorCode, VideoItem, VideoSearchResponse } from "@/lib/types";
import { withRequestLog } from "@/lib/api-route";
import {
  parseDuration,
  parseSortOrder,
  parseUploadDate,
  publishedAfterFor,
  type DurationFilter,
  type UploadDateFilter,
} from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPIC_MIN = 2;
const TOPIC_MAX = 100;
const MAX_INTERESTS = 4;
const MAX_TOTAL = 24;
const DEFAULT_REGION = "VN";

// Duration buckets mirror YouTube's own definition of short/medium/long.
const SHORT_MAX_SECONDS = 4 * 60;
const LONG_MIN_SECONDS = 20 * 60;

function jsonError(topic: string, code: ErrorCode, message: string, status: number) {
  const body: VideoSearchResponse = {
    topic,
    items: [],
    featuredId: null,
    nextPageToken: null,
    error: { code, message },
  };
  return NextResponse.json(body, { status });
}

function parseInterests(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().slice(0, TOPIC_MAX))
    .filter((s) => s.length >= TOPIC_MIN)
    .slice(0, MAX_INTERESTS);
}

function personalize(items: VideoItem[], interests: string[]): VideoItem[] {
  if (items.length === 0 || interests.length === 0) return items;
  const interestNeedles = interests.map((i) => i.toLowerCase());
  return [...items]
    .map((it) => {
      let score = it.viewCount;
      const haystack = (it.title + " " + it.channel).toLowerCase();
      for (const needle of interestNeedles) {
        if (haystack.includes(needle)) score += 50_000;
      }
      return { it, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.it);
}

// The mostPopular chart endpoint accepts no filter parameters, so trending
// results are narrowed here instead.
function applyFiltersInMemory(
  items: VideoItem[],
  duration: DurationFilter,
  uploadDate: UploadDateFilter,
): VideoItem[] {
  let result = items;

  if (duration !== "any") {
    result = result.filter((v) => {
      if (v.durationSeconds <= 0) return true; // unknown duration → keep
      if (duration === "short") return v.durationSeconds < SHORT_MAX_SECONDS;
      if (duration === "long") return v.durationSeconds > LONG_MIN_SECONDS;
      return (
        v.durationSeconds >= SHORT_MAX_SECONDS && v.durationSeconds <= LONG_MIN_SECONDS
      );
    });
  }

  const publishedAfter = publishedAfterFor(uploadDate);
  if (publishedAfter) {
    const cutoff = Date.parse(publishedAfter);
    result = result.filter((v) => {
      if (!v.publishedAt) return true;
      const ts = Date.parse(v.publishedAt);
      return Number.isNaN(ts) ? true : ts >= cutoff;
    });
  }

  return result;
}

export const GET = withRequestLog("api:videos", async (request) => {
  const { searchParams } = new URL(request.url);
  const rawTopic = (searchParams.get("topic") ?? "").trim();
  const topic = rawTopic.slice(0, TOPIC_MAX);
  const interests = parseInterests(searchParams.get("interests"));
  const mode = (searchParams.get("mode") ?? "").toLowerCase();
  const region = (searchParams.get("region") ?? DEFAULT_REGION).slice(0, 2);
  const pageToken = searchParams.get("pageToken");

  const order = parseSortOrder(searchParams.get("order"));
  const duration = parseDuration(searchParams.get("duration"));
  const uploadDate = parseUploadDate(searchParams.get("uploadDate"));

  try {
    // Trending mode: no query required. Used as the default landing experience.
    if (mode === "trending" || (topic.length < TOPIC_MIN && interests.length === 0)) {
      const page = await listTrendingPaged(region, { pageToken });
      const items = applyFiltersInMemory(page.items, duration, uploadDate);

      if (items.length === 0 && !page.nextPageToken) {
        return NextResponse.json(
          {
            topic: "Đề xuất chính",
            items: [],
            featuredId: null,
            nextPageToken: null,
            error: { code: "no-results", message: "Hiện chưa có đề xuất chính." },
          } satisfies VideoSearchResponse,
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          topic: "Đề xuất chính",
          items,
          featuredId: items[0]?.id ?? null,
          nextPageToken: page.nextPageToken,
        } satisfies VideoSearchResponse,
        { status: 200 },
      );
    }

    const queryParts = interests.length > 0 ? [...interests] : [];
    if (topic.length >= TOPIC_MIN) queryParts.push(topic);
    if (queryParts.length === 0) {
      return jsonError(
        topic,
        "invalid-topic",
        "Vui lòng nhập chủ đề hoặc chọn ít nhất một sở thích.",
        400,
      );
    }

    const query = queryParts.join(" | ").slice(0, MAX_TOTAL);
    const page = await searchVideosPaged(query, {
      pageToken,
      order,
      duration,
      publishedAfter: publishedAfterFor(uploadDate),
    });

    // Personalised re-ranking only makes sense for relevance ordering; for
    // explicit sorts we must respect the order the user asked for.
    const items =
      order === "relevance" ? personalize(page.items, interests) : page.items;

    if (items.length === 0 && !page.nextPageToken) {
      return NextResponse.json(
        {
          topic: queryParts.join(", "),
          items: [],
          featuredId: null,
          nextPageToken: null,
          error: { code: "no-results", message: "Không tìm thấy video phù hợp." },
        } satisfies VideoSearchResponse,
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        topic: queryParts.join(", "),
        items,
        featuredId: items[0]?.id ?? null,
        nextPageToken: page.nextPageToken,
      } satisfies VideoSearchResponse,
      { status: 200 },
    );
  } catch (e) {
    if (isStructuredError(e)) {
      const status =
        e.code === "missing-key" ? 503 : e.code === "timeout" || e.code === "network" ? 502 : 502;
      return jsonError(topic, e.code, e.message, status);
    }
    return jsonError(topic, "upstream-error", "Đã xảy ra lỗi không mong muốn.", 500);
  }
});
