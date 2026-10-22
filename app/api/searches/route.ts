import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { isLocale } from "@/lib/locale";
import {
  createVisitorCookie,
  isSameOriginSearchRequest,
  normalizeAnalyticsKeyword,
  parseSearchEvent,
  SEARCH_VISITOR_COOKIE,
  SEARCH_VISITOR_MAX_AGE,
  verifyVisitorCookie,
  visitorIdentifier,
} from "@/lib/search-analytics";
import {
  readPopularSearches,
  recordSearchEvent,
} from "@/lib/search-analytics-store";

export const runtime = "nodejs";

// The same app can run against local, preview and production databases. Cache
// namespaces must never carry one environment's public terms into another.
const databaseCacheKey = createHash("sha256")
  .update(process.env.DATABASE_URL ?? "")
  .digest("hex")
  .slice(0, 20);
const cachedPopularSearches = unstable_cache(
  readPopularSearches,
  ["popular-searches-v1", databaseCacheKey],
  { revalidate: 60 },
);

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale");
  if (!isLocale(locale))
    return NextResponse.json({ message: "Invalid locale." }, { status: 400 });
  try {
    const result = await cachedPopularSearches(locale);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
      },
    });
  } catch {
    // Neither anonymous keywords nor database diagnostics are written to logs.
    return NextResponse.json(
      { message: "Search trends are temporarily unavailable." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginSearchRequest(request)) {
    return NextResponse.json(
      { message: "Invalid request origin." },
      { status: 403 },
    );
  }
  if (
    !/^application\/json(?:;|$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  ) {
    return NextResponse.json({ message: "JSON required." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 2048)
    return NextResponse.json(
      { message: "Request too large." },
      { status: 413 },
    );
  // Read a bounded stream, since clients may omit or lie about Content-Length.
  const reader = request.body?.getReader();
  if (!reader)
    return NextResponse.json({ message: "Invalid event." }, { status: 400 });
  let text = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2048) {
        await reader.cancel();
        return NextResponse.json(
          { message: "Request too large." },
          { status: 413 },
        );
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    return NextResponse.json({ message: "Invalid event." }, { status: 400 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  const parsed = parseSearchEvent(body);
  if (!parsed)
    return NextResponse.json({ message: "Invalid event." }, { status: 400 });
  if (!normalizeAnalyticsKeyword(parsed.keyword))
    return new NextResponse(null, { status: 204 });
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret)
    return NextResponse.json(
      { message: "Search trends are temporarily unavailable." },
      { status: 503 },
    );
  const saved = request.cookies.get(SEARCH_VISITOR_COOKIE)?.value;
  let id = verifyVisitorCookie(saved, secret);
  const freshCookie = !id ? createVisitorCookie(secret) : null;
  if (freshCookie) id = verifyVisitorCookie(freshCookie, secret);
  if (!id)
    return NextResponse.json(
      { message: "Search trends are temporarily unavailable." },
      { status: 503 },
    );
  try {
    const result = await recordSearchEvent(
      parsed,
      visitorIdentifier(id, secret),
    );
    const response =
      result.reason === "rate-limited"
        ? NextResponse.json(
            { message: "Too many searches. Try again later." },
            { status: 429, headers: { "Retry-After": "3600" } },
          )
        : new NextResponse(null, { status: 204 });
    response.headers.set("Cache-Control", "no-store");
    if (freshCookie)
      response.cookies.set(SEARCH_VISITOR_COOKIE, freshCookie, {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/api/searches",
        maxAge: SEARCH_VISITOR_MAX_AGE,
      });
    return response;
  } catch {
    return NextResponse.json(
      { message: "Search trends are temporarily unavailable." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
