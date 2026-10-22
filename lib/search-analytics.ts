import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isLocale, type Locale } from "./locale";

export const SEARCH_WINDOW_DAYS = 7;
export const SEARCH_RETENTION_DAYS = 14;
export const SEARCH_VISITOR_COOKIE = "xemphim_search_visitor";
export const SEARCH_VISITOR_MAX_AGE = SEARCH_RETENTION_DAYS * 24 * 60 * 60;
export const SEARCH_HOURLY_LIMIT = 30;
export const SEARCH_DEDUPE_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SearchEventInput = {
  keyword: string;
  locale: Locale;
  eventId: string;
};

export type PopularSearches = {
  items: { term: string; count: number }[];
  windowDays: 7;
  updatedAt: string;
};

export function parseSearchEvent(value: unknown): SearchEventInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.keyword !== "string" ||
    body.keyword.length < 2 ||
    body.keyword.length > 200 ||
    !isLocale(body.locale) ||
    typeof body.eventId !== "string" ||
    !UUID.test(body.eventId)
  )
    return null;
  return {
    keyword: body.keyword,
    locale: body.locale,
    eventId: body.eventId.toLowerCase(),
  };
}

/** Decline obvious private input before it can enter the public ranking table. */
export function normalizeAnalyticsKeyword(
  value: string,
): { normalized: string; display: string } | null {
  const display = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (
    display.length < 2 ||
    display.length > 200 ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(value) ||
    !/[\p{L}\p{N}]/u.test(display) ||
    /(?:[a-z][a-z\d+.-]*:\/\/|https?:|www\.|mailto:|\S+@\S+)/iu.test(display) ||
    /(?:^|\s)(?:[\p{L}\p{N}-]+\.)+(?:com|net|org|edu|gov|io|dev|app|vn|co|in|tv|me|info|xyz)(?:[\s/?#:]|$)/iu.test(
      display,
    ) ||
    /^[a-z\d_-]{11}$/i.test(display)
  )
    return null;
  const phoneLike = display.match(/\+?\d[\d\s().-]{5,}\d/gu) ?? [];
  if (phoneLike.some((part) => part.replace(/\D/g, "").length >= 7))
    return null;
  const normalized = display
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFC");
  return { normalized, display };
}

export function analyticsWindowStart(now: Date): Date {
  return new Date(now.getTime() - SEARCH_WINDOW_DAYS * DAY_MS);
}

export function analyticsRetentionStart(now: Date): Date {
  return new Date(now.getTime() - SEARCH_RETENTION_DAYS * DAY_MS);
}

function digest(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function createVisitorCookie(secret: string, id = randomUUID()): string {
  if (!secret || !UUID.test(id))
    throw new Error("Invalid analytics identity configuration");
  return `${id}.${digest(secret, `search-cookie:v1:${id}`)}`;
}

export function verifyVisitorCookie(
  cookie: string | undefined,
  secret: string,
): string | null {
  if (!cookie || !secret || cookie.length > 110) return null;
  const [id, signature, extra] = cookie.split(".");
  if (extra || !UUID.test(id ?? "") || !/^[a-f0-9]{64}$/.test(signature ?? ""))
    return null;
  const expected = digest(secret, `search-cookie:v1:${id}`);
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ? id
    : null;
}

export function visitorIdentifier(id: string, secret: string): string {
  return digest(secret, `search-visitor:v1:${id}`);
}

export function eventDeduplicationKey(
  visitorId: string,
  keyword: string,
  locale: Locale,
  now: Date,
): string {
  // visitorId is already an HMAC. Hash the tuple so keywords do not appear in indexes.
  return createHmac("sha256", visitorId)
    .update(
      JSON.stringify([
        locale,
        keyword,
        Math.floor(now.getTime() / SEARCH_DEDUPE_MS),
      ]),
    )
    .digest("hex");
}

/** Browser writes must originate from this deployment, including Vercel previews. */
export function isSameOriginSearchRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site")
    return false;
  try {
    const requestUrl = new URL(request.url);
    if (!/^https?:$/.test(requestUrl.protocol)) return false;
    // NextRequest can normalize 127.0.0.1 into localhost. The original Host
    // preserves the browser's actual origin, including its exact port.
    const host = request.headers.get("host") ?? requestUrl.host;
    if (!host || /[\s/@\\?#,%]/u.test(host)) return false;
    const expected = new URL(`${requestUrl.protocol}//${host}`);
    if (
      expected.username ||
      expected.password ||
      expected.pathname !== "/" ||
      expected.search ||
      expected.hash
    )
      return false;
    const supplied = new URL(origin);
    if (
      supplied.username ||
      supplied.password ||
      supplied.pathname !== "/" ||
      supplied.search ||
      supplied.hash
    )
      return false;
    return supplied.origin === expected.origin;
  } catch {
    return false;
  }
}
