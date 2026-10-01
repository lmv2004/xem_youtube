"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Compass,
  LayoutGrid,
  List,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/filter-chips";
import { VideoFiltersBar } from "@/components/video-filters";
import {
  VideoGrid,
  VideoGridSkeleton,
  type ViewMode,
} from "@/components/video-grid";
import { WatchLaterPanel } from "@/components/watch-later-panel";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useWatchLater } from "@/hooks/use-watch-later";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import {
  DEFAULT_FILTERS,
  filtersToSearchParams,
  parseSortOrder,
  parseDuration,
  parseUploadDate,
  isDefaultFilters,
  type VideoFilters,
} from "@/lib/filters";
import { extractYouTubeId } from "@/lib/youtube-url";
import type { VideoItem, VideoSearchResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HeroExplorer() {
  const router = useRouter();
  const params = useSearchParams();
  const topic = params.get("topic")?.trim() ?? "";
  const filters: VideoFilters = {
    order: parseSortOrder(params.get("order")),
    duration: parseDuration(params.get("duration")),
    uploadDate: parseUploadDate(params.get("uploadDate")),
  };
  const [input, setInput] = useState(topic);
  const [items, setItems] = useState<VideoItem[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const watchLater = useWatchLater();
  const recent = useRecentSearches();

  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem("xemphim:interests") ?? "[]",
      );
      if (Array.isArray(saved))
        setInterests(saved.filter((v): v is string => typeof v === "string"));
      if (localStorage.getItem("xemphim:viewMode") === "list") setView("list");
    } catch {
      /* storage is optional */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    setInput(topic);
  }, [topic]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.key === "/" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !target.isContentEditable &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const apiParams = new URLSearchParams();
  if (topic) apiParams.set("topic", topic);
  else if (!interests.length) apiParams.set("mode", "trending");
  if (interests.length && !topic)
    apiParams.set("interests", interests.join(","));
  filtersToSearchParams(filters, apiParams);
  const apiQuery = apiParams.toString();

  const load = useCallback(
    async (page?: string) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      if (page) setLoadingMore(true);
      else {
        setLoading(true);
        setLoadingMore(false);
        setItems([]);
        setNextPage(null);
      }
      setError("");
      try {
        const query = new URLSearchParams(apiQuery);
        if (page) query.set("pageToken", page);
        const response = await fetch(`/api/videos?${query}`, {
          signal: controller.signal,
        });
        const data: VideoSearchResponse = await response.json();
        if (controller.signal.aborted) return;
        if (data.error?.code === "no-results") {
          if (!page) setItems([]);
          setNextPage(null);
          return;
        }
        if (!response.ok || data.error) throw new Error("fetch-failed");
        setItems((previous) =>
          page
            ? [
                ...previous,
                ...data.items.filter(
                  (item) => !previous.some((v) => v.id === item.id),
                ),
              ]
            : data.items,
        );
        setNextPage(data.nextPageToken ?? null);
      } catch {
        if (!controller.signal.aborted)
          setError(
            "Chưa tải được video. Kiểm tra kết nối và thử lại sau một chút.",
          );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [apiQuery],
  );

  useEffect(() => {
    if (ready) void load();
    return () => requestRef.current?.abort();
  }, [ready, load, retry]);

  const navigate = (value: string, nextFilters = filters) => {
    const query = new URLSearchParams();
    if (value.trim()) query.set("topic", value.trim());
    filtersToSearchParams(nextFilters, query);
    router.push(query.size ? `/?${query}` : "/", { scroll: false });
  };
  const search = (value: string) => {
    const clean = value.trim();
    if (!clean) {
      navigate("", DEFAULT_FILTERS);
      return;
    }
    const id = extractYouTubeId(clean);
    if (id) {
      router.push(`/watch/${id}`);
      return;
    }
    recent.add(clean);
    navigate(clean, DEFAULT_FILTERS);
  };
  const changeView = (next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem("xemphim:viewMode", next);
    } catch {
      /* optional */
    }
  };

  return (
    <div className="space-y-7 sm:space-y-9">
      <section className="discovery-intro rounded-3xl border border-border p-5 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {!topic && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Khám phá mỗi ngày
              </p>
            )}
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {topic ? (
                "Tìm kiếm video"
              ) : (
                <>
                  Một video hay.
                  <br />
                  <span className="text-muted-foreground">
                    Một khoảng nghỉ xứng đáng.
                  </span>
                </>
              )}
            </h1>
            {!topic && (
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Tìm điều bạn thích, lưu để xem sau hoặc rủ bạn bè cùng xem.
              </p>
            )}
          </div>
          <Link
            href="/rooms"
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted xl:inline-flex"
          >
            Xem cùng bạn bè <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            search(input);
          }}
          className="flex items-center gap-2 rounded-2xl border border-input bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring"
        >
          <Search className="ml-2 hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
          <input
            ref={inputRef}
            minLength={2}
            maxLength={500}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-label="Tìm video hoặc dán liên kết YouTube"
            placeholder="Từ khóa hoặc link YouTube"
            className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
          />
          {input && (
            <button
              type="button"
              aria-label="Xóa từ khóa"
              onClick={() => {
                setInput("");
                inputRef.current?.focus();
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Button type="submit" className="h-10 rounded-xl px-3 sm:px-5">
            <Search className="sm:hidden" />
            <span className="hidden sm:inline">Tìm kiếm</span>
            <span className="sr-only sm:hidden">Tìm kiếm</span>
          </Button>
        </form>
        {!topic && recent.items.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Gần đây</span>
            {recent.items.slice(0, 3).map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => search(term)}
                className="max-w-40 truncate rounded-full border border-border px-3 py-2 hover:bg-background"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </section>

      <FilterChips
        value={topic || null}
        onChange={(value) => navigate(value ?? "", DEFAULT_FILTERS)}
      />
      <section
        aria-labelledby="feed-heading"
        aria-busy={loading}
        className="space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="feed-heading"
              className="break-words font-display text-xl font-semibold sm:text-2xl"
            >
              {topic
                ? `Kết quả cho “${topic}”`
                : interests.length
                  ? "Dành cho bạn"
                  : "Đang thịnh hành"}
            </h2>
            <p role="status" className="mt-1 text-sm text-muted-foreground">
              {loading
                ? "Đang tìm những video phù hợp…"
                : `${items.length} video${nextPage ? " · còn nhiều hơn để khám phá" : ""}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {topic ? (
              <VideoFiltersBar
                value={filters}
                onChange={(value) => navigate(topic, value)}
                disabled={loading}
              />
            ) : (
              <Button
                variant="outline"
                onClick={() => setPreferencesOpen(true)}
                className="rounded-xl"
              >
                <SlidersHorizontal /> Sở thích
              </Button>
            )}
            <div
              role="group"
              aria-label="Kiểu hiển thị"
              className="flex rounded-xl border border-border bg-card p-1"
            >
              {(["grid", "list"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-label={
                    mode === "grid"
                      ? "Hiển thị dạng lưới"
                      : "Hiển thị dạng danh sách"
                  }
                  aria-pressed={view === mode}
                  onClick={() => changeView(mode)}
                  className={cn(
                    "grid h-9 w-10 place-items-center rounded-lg",
                    view === mode
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {mode === "grid" ? (
                    <LayoutGrid className="h-4 w-4" />
                  ) : (
                    <List className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        {topic && (
          <button
            type="button"
            onClick={() => navigate("", DEFAULT_FILTERS)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
          >
            <X className="h-4 w-4" /> Xóa tìm kiếm
          </button>
        )}
        {!isDefaultFilters(filters) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(topic, DEFAULT_FILTERS)}
          >
            Đặt lại bộ lọc
          </Button>
        )}
        {loading ? (
          <VideoGridSkeleton count={6} view={view} />
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-border bg-card p-6 text-center"
              >
                <p className="font-medium">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() =>
                    items.length && nextPage
                      ? void load(nextPage)
                      : setRetry((value) => value + 1)
                  }
                >
                  Thử lại
                </Button>
              </div>
            )}
            {!error && !items.length && (
              <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                <Compass className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <h3 className="font-semibold">Chưa tìm thấy video phù hợp</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thử từ khóa khác hoặc bỏ bớt bộ lọc.
                </p>
                <Button
                  variant="secondary"
                  className="mt-5"
                  onClick={() => navigate("", DEFAULT_FILTERS)}
                >
                  Khám phá video thịnh hành
                </Button>
              </div>
            )}
            <VideoGrid
              items={items}
              view={view}
              onToggleWatchLater={watchLater.toggle}
              isInWatchLater={watchLater.has}
            />
            {nextPage && !error && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  className="min-w-44 rounded-xl"
                  disabled={loadingMore}
                  onClick={() => void load(nextPage)}
                >
                  {loadingMore && <Loader2 className="animate-spin" />}
                  {loadingMore ? "Đang tải…" : "Xem thêm video"}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
      <WatchLaterPanel
        items={watchLater.items}
        onPlay={(item) => router.push(`/watch/${item.id}`)}
        onRemove={watchLater.remove}
        onClear={watchLater.clear}
      />
      <OnboardingModal
        isOpen={preferencesOpen}
        onOpenChange={setPreferencesOpen}
        onComplete={(selected) => {
          setInterests(selected);
          setPreferencesOpen(false);
          try {
            localStorage.setItem("xemphim:interests", JSON.stringify(selected));
          } catch {
            /* optional */
          }
        }}
      />
    </div>
  );
}
