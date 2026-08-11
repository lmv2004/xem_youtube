"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid,
  List,
  Loader2,
  Maximize2,
  Minimize2,
  PlayCircle,
  Search,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";
import type { ErrorCode, SearchStatus, VideoItem, VideoSearchResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Glass } from "@/components/ui/glass";
import { Skeleton } from "@/components/ui/skeleton";
import { InterestPicker } from "@/components/interest-picker";
import { FeaturedPlayer, type FeaturedPlayerHandle } from "@/components/featured-player";
import { VideoGrid, type ViewMode } from "@/components/video-grid";
import { MiniPlayer } from "@/components/mini-player";
import { FilterChips } from "@/components/filter-chips";
import { VideoFiltersBar } from "@/components/video-filters";
import { WatchLaterPanel } from "@/components/watch-later-panel";
import { useWatchLater } from "@/hooks/use-watch-later";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { DEFAULT_FILTERS, filtersToSearchParams, type VideoFilters } from "@/lib/filters";
import { cn } from "@/lib/utils";

const STORAGE_INTERESTS = "xemphim:interests";
const STORAGE_LAST_TOPIC = "xemphim:lastTopic";
const STORAGE_LAST_MODE = "xemphim:lastMode";
const STORAGE_VIEW = "xemphim:viewMode";

type Mode = "trending" | "search";
type Persisted = { interests: string[]; topic: string; mode: Mode };

function readPersisted(): Persisted {
  if (typeof window === "undefined") return { interests: [], topic: "", mode: "trending" };
  try {
    const interests = JSON.parse(localStorage.getItem(STORAGE_INTERESTS) ?? "[]") as string[];
    const topic = localStorage.getItem(STORAGE_LAST_TOPIC) ?? "";
    const mode = (localStorage.getItem(STORAGE_LAST_MODE) as Mode | null) ?? "trending";
    return {
      interests: Array.isArray(interests) ? interests : [],
      topic,
      mode: mode === "search" ? "search" : "trending",
    };
  } catch {
    return { interests: [], topic: "", mode: "trending" };
  }
}

function writePersisted(p: Persisted) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_INTERESTS, JSON.stringify(p.interests));
    if (p.topic) localStorage.setItem(STORAGE_LAST_TOPIC, p.topic);
    else localStorage.removeItem(STORAGE_LAST_TOPIC);
    localStorage.setItem(STORAGE_LAST_MODE, p.mode);
  } catch {
    /* ignore */
  }
}

export function HeroExplorer() {
  const [interests, setInterests] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<string | null>(null);
  const [filters, setFilters] = useState<VideoFilters>(DEFAULT_FILTERS);
  const [view, setView] = useState<ViewMode>("grid");

  const [items, setItems] = useState<VideoItem[]>([]);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [responseTopic, setResponseTopic] = useState("");
  const [error, setError] = useState<{ code: ErrorCode; message: string } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [theater, setTheater] = useState(false);
  const [miniOpen, setMiniOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const requestSeq = useRef(0);
  const featuredRef = useRef<FeaturedPlayerHandle>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const watchLater = useWatchLater();
  const recent = useRecentSearches();

  const activeTopic = chip ?? query;
  const mode: Mode =
    activeTopic.trim().length >= 2 || interests.length > 0 ? "search" : "trending";

  useEffect(() => {
    const p = readPersisted();
    setInterests(p.interests);
    setTopicInput(p.topic);
    setQuery(p.mode === "search" ? p.topic : "");
    try {
      const storedView = localStorage.getItem(STORAGE_VIEW);
      if (storedView === "list" || storedView === "grid") setView(storedView);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writePersisted({ interests, topic: activeTopic, mode });
  }, [interests, activeTopic, mode, hydrated]);

  const changeView = useCallback((next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem(STORAGE_VIEW, next);
    } catch {
      /* ignore */
    }
  }, []);

  const buildUrl = useCallback(
    (pageToken?: string | null) => {
      const params = new URLSearchParams();
      const t = activeTopic.trim();
      if (mode === "trending") {
        params.set("mode", "trending");
      } else {
        if (t.length >= 2) params.set("topic", t);
        if (interests.length > 0) params.set("interests", interests.join(","));
      }
      filtersToSearchParams(filters, params);
      if (pageToken) params.set("pageToken", pageToken);
      return "/api/videos?" + params.toString();
    },
    [activeTopic, mode, interests, filters],
  );

  const load = useCallback(
    async (pageToken: string | null) => {
      const isAppend = Boolean(pageToken);
      const seq = ++requestSeq.current;

      if (isAppend) setIsLoadingMore(true);
      else setIsLoading(true);

      try {
        const res = await fetch(buildUrl(pageToken), { cache: "no-store" });
        const json = (await res.json()) as VideoSearchResponse;
        if (seq !== requestSeq.current) return;

        setResponseTopic(json.topic ?? "");
        setError(json.error ?? null);
        setNextPageToken(json.nextPageToken ?? null);

        if (isAppend) {
          setItems((prev) => {
            const seen = new Set(prev.map((v) => v.id));
            return [...prev, ...json.items.filter((v) => !seen.has(v.id))];
          });
        } else {
          setItems(json.items);
          setFeaturedId(json.featuredId);
        }
      } catch {
        if (seq !== requestSeq.current) return;
        setError({ code: "network", message: "Không thể gọi máy chủ." });
        if (!isAppend) {
          setItems([]);
          setFeaturedId(null);
          setNextPageToken(null);
        }
      } finally {
        if (seq === requestSeq.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [buildUrl],
  );

  useEffect(() => {
    if (!hydrated) return;
    void load(null);
  }, [hydrated, query, chip, interests, filters, load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextPageToken || isLoading || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void load(nextPageToken);
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextPageToken, isLoading, isLoadingMore, load]);

  // Keyboard shortcuts: "/" focus search, "t" theater, Escape closes overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true;

      if (e.key === "Escape") {
        setSuggestOpen(false);
        setTheater(false);
        if (typing) inputRef.current?.blur();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key.toLowerCase() === "t") {
        setTheater((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const featured = useMemo(
    () => items.find((v) => v.id === featuredId) ?? null,
    [items, featuredId],
  );
  const rest = useMemo(() => items.filter((v) => v.id !== featuredId), [items, featuredId]);

  const playItem = useCallback((item: VideoItem) => {
    setItems((prev) => (prev.some((v) => v.id === item.id) ? prev : [item, ...prev]));
    setFeaturedId(item.id);
    setMiniOpen(false);
    requestAnimationFrame(() => featuredRef.current?.scrollIntoView());
  }, []);

  const playNext = useCallback(() => {
    const upcoming = watchLater.next(featuredId);
    if (upcoming) playItem(upcoming);
  }, [watchLater, featuredId, playItem]);

  const submitSearch = useCallback(
    (term: string) => {
      const t = term.trim();
      if (t.length < 2 && interests.length === 0) return;
      setChip(null);
      setTopicInput(t);
      setQuery(t);
      setSuggestOpen(false);
      if (t.length >= 2) recent.add(t);
    },
    [interests.length, recent],
  );

  const status = toStatus({ activeTopic: responseTopic, items, error, isLoading });

  function resetToTrending() {
    setChip(null);
    setQuery("");
    setTopicInput("");
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="space-y-7 sm:space-y-8">
      <Hero />

      <Glass
        intensity="strong"
        className="space-y-4 p-4 sm:space-y-5 sm:p-6 glow-soft animate-in-up"
      >
        <form
          className="flex flex-col gap-2.5 sm:flex-row sm:gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch(topicInput);
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Tìm theo từ khoá tuỳ ý..."
              className="glass-input h-11 pl-10 pr-12 text-base"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onFocus={() => setSuggestOpen(true)}
              // Delay so a click on a suggestion registers before the list closes.
              onBlur={() => window.setTimeout(() => setSuggestOpen(false), 150)}
              maxLength={100}
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground sm:block">
              /
            </kbd>

            {suggestOpen && recent.items.length > 0 ? (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tìm gần đây
                  </span>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={recent.clear}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Xoá hết
                  </button>
                </div>
                <ul>
                  {recent.items.map((term) => (
                    <li key={term} className="flex items-center gap-1">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => submitSearch(term)}
                        className="flex flex-1 items-center gap-2 truncate rounded-lg px-2 py-1.5 text-left text-sm hover:bg-foreground/5"
                      >
                        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{term}</span>
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => recent.remove(term)}
                        aria-label={"Xoá " + term}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <Button
            type="submit"
            size="lg"
            className="glow-primary"
            disabled={isLoading || (topicInput.trim().length < 2 && interests.length === 0)}
          >
            {isLoading ? "Đang tìm..." : "Tìm video"}
          </Button>
        </form>

        <FilterChips
          value={chip}
          disabled={isLoading}
          onChange={(topic) => {
            setChip(topic);
            if (topic) setTopicInput(topic);
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <VideoFiltersBar value={filters} onChange={setFilters} disabled={isLoading} />
          <ViewToggle view={view} onChange={changeView} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-foreground/5 text-foreground ring-1 ring-border">
            {mode === "trending" ? (
              <>
                <Sparkles className="mr-1 h-3 w-3 text-primary" /> Đề xuất chính
              </>
            ) : (
              <>
                <PlayCircle className="mr-1 h-3 w-3 text-primary" /> {responseTopic || "Đã tìm"}
              </>
            )}
          </Badge>
          {mode === "search" ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetToTrending}>
              <X className="mr-1" /> Quay lại đề xuất chính
            </Button>
          ) : null}
        </div>

        <InterestPicker value={interests} onChange={setInterests} />
      </Glass>

      <StatusMessage status={status} view={view} onRetry={() => void load(null)} />

      {featured ? (
        <section
          className={cn(
            "space-y-3 transition-all duration-300",
            theater &&
              "-mx-3 rounded-3xl bg-black/50 px-3 py-4 backdrop-blur sm:-mx-6 sm:px-6 sm:py-5 lg:-mx-10 lg:px-10",
          )}
        >
          <div className="flex items-center justify-end gap-1 sm:gap-2">
            {watchLater.next(featuredId) ? (
              <Button type="button" size="sm" variant="ghost" onClick={playNext}>
                <SkipForward className="mr-1 h-4 w-4" /> Phát tiếp
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setTheater((v) => !v)}
              aria-pressed={theater}
              title="Phím tắt: T"
            >
              {theater ? (
                <>
                  <Minimize2 className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Thoát rạp phim</span>
                </>
              ) : (
                <>
                  <Maximize2 className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Chế độ rạp phim</span>
                </>
              )}
            </Button>
          </div>

          <div className={cn(theater && "mx-auto max-w-6xl")}>
            <FeaturedPlayer
              ref={featuredRef}
              item={featured}
              minimized={miniOpen}
              onMinimizeToggle={() => setMiniOpen((v) => !v)}
            />
          </div>
        </section>
      ) : null}

      <WatchLaterPanel
        items={watchLater.items}
        currentId={featuredId}
        onPlay={playItem}
        onRemove={watchLater.remove}
        onClear={watchLater.clear}
      />

      {rest.length > 0 ? (
        <section className="space-y-4 animate-in-up">
          <SectionHeading
            title={mode === "trending" ? "Đang thịnh hành" : "Đề xuất liên quan"}
            subtitle={
              mode === "trending"
                ? "Tự động theo khu vực Việt Nam"
                : "Gợi ý cho \"" + (responseTopic || activeTopic) + "\""
            }
          />
          <VideoGrid
            items={rest}
            view={view}
            activeId={featuredId}
            onPlay={playItem}
            onToggleWatchLater={watchLater.toggle}
            isInWatchLater={watchLater.has}
          />

          <div ref={sentinelRef} aria-hidden className="h-1 w-full" />

          {isLoadingMore ? (
            <p className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải thêm video...
            </p>
          ) : null}

          {!nextPageToken && !isLoading ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Đã hiển thị hết kết quả.
            </p>
          ) : null}
        </section>
      ) : null}

      <MiniPlayer
        item={miniOpen ? featured : null}
        onClose={() => setMiniOpen(false)}
        onExpand={() => {
          setMiniOpen(false);
          requestAnimationFrame(() => featuredRef.current?.scrollIntoView());
        }}
      />
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Kiểu hiển thị"
      className="flex items-center gap-0.5 rounded-full border border-border p-0.5"
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={view === "grid"}
        aria-label="Hiển thị dạng lưới"
        className={cn(
          "grid h-7 w-8 place-items-center rounded-full transition",
          view === "grid"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={view === "list"}
        aria-label="Hiển thị dạng danh sách"
        className={cn(
          "grid h-7 w-8 place-items-center rounded-full transition",
          view === "list"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function toStatus({
  activeTopic,
  items,
  error,
  isLoading,
}: {
  activeTopic: string;
  items: VideoItem[];
  error: { code: ErrorCode; message: string } | null;
  isLoading: boolean;
}): SearchStatus {
  if (isLoading && items.length === 0) return { kind: "loading", topic: activeTopic };
  if (error?.code === "missing-key") return { kind: "missing-key" };
  if (error && items.length === 0) {
    return { kind: "error", topic: activeTopic, code: error.code, message: error.message };
  }
  if (!isLoading && items.length === 0 && activeTopic) return { kind: "empty", topic: activeTopic };
  if (items.length === 0) return { kind: "idle" };
  return { kind: "ready", topic: activeTopic, items, featuredId: items[0]?.id ?? null };
}

function Hero() {
  return (
    <section className="relative isolate animate-in-up">
      <div className="space-y-3 text-center">
        <Badge
          variant="secondary"
          className="mx-auto inline-flex w-fit bg-foreground/5 text-foreground ring-1 ring-border"
        >
          <Sparkles className="mr-1 h-3 w-3 text-primary" /> Cá nhân hoá theo sở thích
        </Badge>
        <h1 className="font-display text-3xl font-bold leading-[1.12] tracking-tight sm:text-5xl md:text-6xl">
          Khám phá video YouTube
          <br className="hidden sm:block" />{" "}
          <span className="text-gradient">theo cách của bạn.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
          Chọn vài sở thích, hệ thống tự động tìm và đề xuất video xu hướng từ YouTube.
        </p>
      </div>
    </section>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle ? (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function StatusMessage({
  status,
  view,
  onRetry,
}: {
  status: SearchStatus;
  view: ViewMode;
  onRetry: () => void;
}) {
  if (status.kind === "idle" || status.kind === "ready") return null;
  if (status.kind === "loading") {
    return (
      <div className="space-y-3" aria-live="polite">
        <p className="text-sm text-muted-foreground">Đang tải đề xuất...</p>
        <ul
          className={cn(
            view === "grid"
              ? "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4"
              : "flex flex-col gap-3",
          )}
          aria-hidden
        >
          {Array.from({ length: 6 }).map((_, i) =>
            view === "grid" ? (
              <li key={i} className="overflow-hidden rounded-2xl glass">
                <Skeleton className="aspect-video w-full" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </li>
            ) : (
              <li key={i} className="flex gap-3 rounded-2xl glass p-2.5">
                <Skeleton className="aspect-video w-36 shrink-0 rounded-xl sm:w-52" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </li>
            ),
          )}
        </ul>
      </div>
    );
  }
  if (status.kind === "empty") {
    return (
      <Glass intensity="soft" className="p-4 text-sm">
        Không tìm thấy video cho chủ đề <strong>{status.topic}</strong>. Thử bớt bộ lọc hoặc
        đổi chủ đề nhé.
      </Glass>
    );
  }
  if (status.kind === "missing-key") {
    return (
      <Glass intensity="soft" className="border-destructive/40 bg-destructive/10 p-4 text-sm">
        Máy chủ chưa được cấu hình <code className="rounded bg-muted px-1">YOUTUBE_API_KEY</code>.
        Thêm biến này vào <code className="rounded bg-muted px-1">.env.local</code> rồi khởi động
        lại <code className="rounded bg-muted px-1">npm run dev</code>.
      </Glass>
    );
  }
  if (status.kind === "error") {
    return (
      <Glass intensity="soft" className="border-destructive/40 bg-destructive/10 p-4 text-sm">
        <p className="font-medium text-destructive">Không thể tải video.</p>
        <p className="mt-1 text-muted-foreground">{status.message}</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>
          Thử lại
        </Button>
      </Glass>
    );
  }
  return null;
}
