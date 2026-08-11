// Shared, dependency-free filter model.
// Imported by both client components and the /api/videos route, so it must not
// pull in any server-only or React code.

export type SortOrder = "relevance" | "date" | "viewCount" | "rating";
export type DurationFilter = "any" | "short" | "medium" | "long";
export type UploadDateFilter =
  | "any"
  | "hour"
  | "today"
  | "week"
  | "month"
  | "year";

export type VideoFilters = {
  order: SortOrder;
  duration: DurationFilter;
  uploadDate: UploadDateFilter;
};

export const DEFAULT_FILTERS: VideoFilters = {
  order: "relevance",
  duration: "any",
  uploadDate: "any",
};

export const ORDER_LABELS: Record<SortOrder, string> = {
  relevance: "Liên quan nhất",
  date: "Mới nhất",
  viewCount: "Xem nhiều nhất",
  rating: "Đánh giá cao",
};

export const DURATION_LABELS: Record<DurationFilter, string> = {
  any: "Mọi thời lượng",
  short: "Dưới 4 phút",
  medium: "4 – 20 phút",
  long: "Trên 20 phút",
};

export const UPLOAD_DATE_LABELS: Record<UploadDateFilter, string> = {
  any: "Mọi lúc",
  hour: "1 giờ qua",
  today: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  year: "Năm nay",
};

const UPLOAD_DATE_MS: Record<Exclude<UploadDateFilter, "any">, number> = {
  hour: 60 * 60 * 1000,
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

const ORDERS: readonly SortOrder[] = ["relevance", "date", "viewCount", "rating"];
const DURATIONS: readonly DurationFilter[] = ["any", "short", "medium", "long"];
const UPLOAD_DATES: readonly UploadDateFilter[] = [
  "any",
  "hour",
  "today",
  "week",
  "month",
  "year",
];

export function parseSortOrder(value: string | null | undefined): SortOrder {
  return ORDERS.includes(value as SortOrder) ? (value as SortOrder) : "relevance";
}

export function parseDuration(value: string | null | undefined): DurationFilter {
  return DURATIONS.includes(value as DurationFilter)
    ? (value as DurationFilter)
    : "any";
}

export function parseUploadDate(
  value: string | null | undefined,
): UploadDateFilter {
  return UPLOAD_DATES.includes(value as UploadDateFilter)
    ? (value as UploadDateFilter)
    : "any";
}

// Converts the "upload date" filter into an RFC-3339 timestamp understood by
// the YouTube Data API `publishedAfter` parameter.
export function publishedAfterFor(
  filter: UploadDateFilter,
  now: number = Date.now(),
): string | null {
  if (filter === "any") return null;
  return new Date(now - UPLOAD_DATE_MS[filter]).toISOString();
}

export function isDefaultFilters(filters: VideoFilters): boolean {
  return (
    filters.order === DEFAULT_FILTERS.order &&
    filters.duration === DEFAULT_FILTERS.duration &&
    filters.uploadDate === DEFAULT_FILTERS.uploadDate
  );
}

export function countActiveFilters(filters: VideoFilters): number {
  let n = 0;
  if (filters.order !== DEFAULT_FILTERS.order) n += 1;
  if (filters.duration !== DEFAULT_FILTERS.duration) n += 1;
  if (filters.uploadDate !== DEFAULT_FILTERS.uploadDate) n += 1;
  return n;
}

// Only writes non-default values so the request URL stays short and cacheable.
export function filtersToSearchParams(
  filters: VideoFilters,
  params: URLSearchParams,
): void {
  if (filters.order !== "relevance") params.set("order", filters.order);
  if (filters.duration !== "any") params.set("duration", filters.duration);
  if (filters.uploadDate !== "any") params.set("uploadDate", filters.uploadDate);
}
