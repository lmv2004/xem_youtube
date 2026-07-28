import { NextResponse } from "next/server";
import { isStructuredError, listTrending, searchVideos } from "@/lib/youtube";
import type { ErrorCode, VideoItem, VideoSearchResponse } from "@/lib/types";
import { withRequestLog } from "@/lib/api-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPIC_MIN = 2;
const TOPIC_MAX = 100;
const MAX_INTERESTS = 4;
const MAX_TOTAL = 24;
const DEFAULT_REGION = "VN";

function jsonError(topic: string, code: ErrorCode, message: string, status: number) {
  const body: VideoSearchResponse = {
    topic,
    items: [],
    featuredId: null,
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
      const haystack = `${it.title} ${it.channel}`.toLowerCase();
      for (const needle of interestNeedles) {
        if (haystack.includes(needle)) score += 50_000;
      }
      return { it, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.it);
}

export const GET = withRequestLog("api:videos", async (request) => {
  const { searchParams } = new URL(request.url);
  const rawTopic = (searchParams.get("topic") ?? "").trim();
  const topic = rawTopic.slice(0, TOPIC_MAX);
  const interests = parseInterests(searchParams.get("interests"));
  const mode = (searchParams.get("mode") ?? "").toLowerCase();
  const region = (searchParams.get("region") ?? DEFAULT_REGION).slice(0, 2);

  try {
    // Trending mode: no query required. Used as the default landing experience.
    if (mode === "trending" || (topic.length < TOPIC_MIN && interests.length === 0)) {
      const items = await listTrending(region);
      if (items.length === 0) {
        return NextResponse.json(
          {
            topic: "Đề xuất chính",
            items: [],
            featuredId: null,
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
        } satisfies VideoSearchResponse,
        { status: 200 },
      );
    }

    if (topic.length < TOPIC_MIN && interests.length === 0) {
      return jsonError(
        topic,
        "invalid-topic",
        "Vui lòng nhập chủ đề hoặc chọn ít nhất một sở thích.",
        400,
      );
    }

    const queryParts = interests.length > 0 ? [...interests] : [];
    if (topic.length >= TOPIC_MIN) queryParts.push(topic);
    const query = queryParts.join(" | ").slice(0, MAX_TOTAL);

    const items = await searchVideos(query);
    const personalized = personalize(items, interests);
    if (personalized.length === 0) {
      return NextResponse.json(
        {
          topic: queryParts.join(", "),
          items: [],
          featuredId: null,
          error: { code: "no-results", message: "Không tìm thấy video phù hợp." },
        } satisfies VideoSearchResponse,
        { status: 200 },
      );
    }
    return NextResponse.json(
      {
        topic: queryParts.join(", "),
        items: personalized,
        featuredId: personalized[0]?.id ?? null,
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
