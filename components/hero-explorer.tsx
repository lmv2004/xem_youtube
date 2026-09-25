"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Compass,
  Filter,
  Flame,
  LayoutGrid,
  List,
  Loader2,
  Music,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  TrendingUp,
  Tv,
  X,
} from "lucide-react";
import type { ErrorCode, SearchStatus, VideoItem, VideoSearchResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Glass } from "@/components/ui/glass";
import { FilterChips } from "@/components/filter-chips";
import { VideoFiltersBar } from "@/components/video-filters";
import { VideoGrid, VideoGridSkeleton, type ViewMode } from "@/components/video-grid";
import { FeaturedPlayer, type FeaturedPlayerHandle } from "@/components/featured-player";
import { MiniPlayer } from "@/components/mini-player";
import { WatchLaterPanel } from "@/components/watch-later-panel";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useWatchLater } from "@/hooks/use-watch-later";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { DEFAULT_FILTERS, filtersToSearchParams, type VideoFilters } from "@/lib/filters";
import { cn } from "@/lib/utils";

const STORAGE_INTERESTS = "xemphim:interests";
const STORAGE_LAST_TOPIC = "xemphim:lastTopic";
const STORAGE_LAST_MODE = "xemphim:lastMode";
const STORAGE_VIEW = "xemphim:viewMode";

type Mode = "trending" | "search";

export function HeroExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTopic = searchParams.get("topic");

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
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const [theater, setTheater] = useState(false);
  const [miniOpen, setMiniOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  // Additional curated feed sections for discovery landing
  const [musicItems, setMusicItems] = useState<VideoItem[]>([]);
  const [techItems, setTechItems] = useState<VideoItem[]>([]);
  const [loadingCurated, setLoadingCurated] = useState(false);

  const requestSeq = useRef(0);
  const featuredRef = useRef<FeaturedPlayerHandle>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const watchLater = useWatchLater();
  const recent = useRecentSearches();

  const activeTopic = chip ?? query;
  const isCustomFeed = Boolean(activeTopic.trim());
  const mode: Mode = isCustomFeed || interests.length > 0 ? "search" : "trending";

  // Hydrate state from localStorage or URL parameter
  useEffect(() => {
    try {
      const storedInterests = JSON.parse(
        localStorage.getItem(STORAGE_INTERESTS) ?? "[]",
      ) as string[];
      setInterests(Array.isArray(storedInterests) ? storedInterests : []);

      const storedView = localStorage.getItem(STORAGE_VIEW);
      if (storedView === "list" || storedView === "grid") setView(storedView);

      if (urlTopic) {
        setTopicInput(urlTopic);
        setQuery(urlTopic);
      } else {
        const lastTopic = localStorage.getItem(STORAGE_LAST_TOPIC) ?? "";
        const lastMode = localStorage.getItem(STORAGE_LAST_MODE);
        if (lastMode === "search" && lastTopic) {
          setTopicInput(lastTopic);
          setQuery(lastTopic);
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [urlTopic]);

  // Sync state changes with localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_INTERESTS, JSON.stringify(interests));
      if (activeTopic) localStorage.setItem(STORAGE_LAST_TOPIC, activeTopic);
      else localStorage.removeItem(STORAGE_LAST_TOPIC);
      localStorage.setItem(STORAGE_LAST_MODE, mode);
    } catch {
      /* ignore */
    }
  }, [interests, activeTopic, mode, hydrated]);

  // Listen for search events from header
  useEffect(() => {
    const handleHeaderSearch = (e: Event) => {
      const detail = (e as CustomEvent<{ topic: string }>).detail;
      if (detail?.topic) {
        setChip(null);
        setTopicInput(detail.topic);
        setQuery(detail.topic);
      }
    };
    window.addEventListener("xemphim:search", handleHeaderSearch);
    return () => window.removeEventListener("xemphim:search", handleHeaderSearch);
  }, []);

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

  // Load curated sections for default landing page
  useEffect(() => {
    if (!hydrated || isCustomFeed) return;
    let isCancelled = false;
    (async () => {
      setLoadingCurated(true);
      try {
        const [musicRes, techRes] = await Promise.all([
          fetch("/api/videos?topic=Âm+nhạc+Việt+Nam&limit=6", { cache: "no-store" }),
          fetch("/api/videos?topic=Công+nghệ+Lập+trình&limit=6", { cache: "no-store" }),
        ]);
        if (!isCancelled) {
          if (musicRes.ok) {
            const mJson = (await musicRes.json()) as VideoSearchResponse;
            setMusicItems(mJson.items?.slice(0, 6) ?? []);
          }
          if (techRes.ok) {
            const tJson = (await techRes.json()) as VideoSearchResponse;
            setTechItems(tJson.items?.slice(0, 6) ?? []);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!isCancelled) setLoadingCurated(false);
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, [hydrated, isCustomFeed]);

  useEffect(() => {
    if (!hydrated) return;
    void load(null);
  }, [hydrated, query, chip, interests, filters, load]);

  // Infinite scroll
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
      setChip(null);
      setTopicInput(t);
      setQuery(t);
      setSuggestOpen(false);
      if (t.length >= 2) recent.add(t);
      router.push(t ? `/?topic=${encodeURIComponent(t)}` : "/");
    },
    [recent, router],
  );

  const resetToHome = useCallback(() => {
    setChip(null);
    setQuery("");
    setTopicInput("");
    setFilters(DEFAULT_FILTERS);
    router.push("/");
  }, [router]);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Onboarding Dialog */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onComplete={(selected) => {
          setInterests(selected);
          void load(null);
        }}
      />

      {/* Discovery Hero Search & Categories Bar */}
      <section className="space-y-4">
        {/* Prominent Discovery Search Bar */}
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(topicInput);
            }}
            className="relative flex items-center"
          >
            <Search className="pointer-events-none absolute left-4 h-5 w-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              placeholder="Tìm video, chủ đề, kênh..."
              className="h-12 sm:h-14 w-full rounded-2xl border border-border/70 bg-card/70 pl-11 pr-28 text-base text-foreground shadow-sm backdrop-blur transition placeholder:text-muted-foreground/80 focus:border-primary/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
              {topicInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setTopicInput("");
                    setQuery("");
                    setChip(null);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
              <Button type="submit" size="sm" className="rounded-xl px-4 glow-primary">
                Tìm kiếm
              </Button>
            </div>
          </form>

          {/* Autocomplete / Recent Searches Dropdown */}
          {suggestOpen && recent.items.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tìm kiếm gần đây
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={recent.clear}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Xóa tất cả
                </button>
              </div>
              <div className="flex flex-col gap-0.5">
                {recent.items.slice(0, 5).map((term) => (
                  <div
                    key={term}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-foreground/5"
                  >
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => submitSearch(term)}
                      className="flex flex-1 items-center gap-2.5 text-left text-foreground/90"
                    >
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{term}</span>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => recent.remove(term)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={"Xóa " + term}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Horizontal Category Chips */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <FilterChips
              value={chip}
              onChange={(nextChip) => {
                setChip(nextChip);
                setTopicInput(nextChip ?? "");
                setQuery(nextChip ?? "");
              }}
              disabled={isLoading}
            />
          </div>

          {/* Preference Pill */}
          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            title="Tuỳ chỉnh chủ đề yêu thích"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Sở thích</span>
            {interests.length > 0 ? (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                {interests.length}
              </span>
            ) : null}
          </button>
        </div>

        {/* User's Selected Interests Bar */}
        {interests.length > 0 && !isCustomFeed && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-foreground/75 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Đang ưu tiên:
            </span>
            {interests.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => {
                  setChip(topic);
                  setQuery(topic);
                }}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary hover:bg-primary/20 transition"
              >
                {topic}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOnboardingOpen(true)}
              className="text-[11px] underline underline-offset-2 hover:text-foreground"
            >
              Chỉnh sửa
            </button>
          </div>
        )}
      </section>

      {/* Main Content Area: Search Results OR Curated Discovery Home */}
      {isCustomFeed ? (
        // Custom search or selected topic results
        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  {responseTopic ? `Kết quả cho "${responseTopic}"` : "Đang tìm kiếm..."}
                </h2>
                <button
                  type="button"
                  onClick={resetToHome}
                  className="rounded-lg p-1 text-xs text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                  title="Xoá bộ lọc về trang chủ"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {items.length} video tìm thấy
              </p>
            </div>

            <div className="flex items-center gap-2">
              <VideoFiltersBar
                value={filters}
                onChange={setFilters}
                disabled={isLoading}
              />
              <ViewToggle view={view} onChange={changeView} />
            </div>
          </div>

          {/* Active search video grid or loading skeletons */}
          {isLoading && items.length === 0 ? (
            <VideoGridSkeleton count={8} view={view} />
          ) : error && items.length === 0 ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
              <p className="font-semibold text-destructive">Không thể tải video.</p>
              <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => void load(null)}>
                Thử lại
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-10 text-center">
              <Compass className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-foreground">Không tìm thấy video nào.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hãy thử đổi từ khóa tìm kiếm hoặc bớt bộ lọc.
              </p>
              <Button size="sm" variant="secondary" className="mt-4" onClick={resetToHome}>
                Xem video thịnh hành
              </Button>
            </div>
          ) : (
            <VideoGrid
              items={items}
              view={view}
              onPlay={playItem}
              onToggleWatchLater={watchLater.toggle}
              isInWatchLater={watchLater.has}
              activeId={featuredId}
            />
          )}

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="py-4 text-center">
            {isLoadingMore && (
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Đang tải thêm video...</span>
              </div>
            )}
          </div>
        </section>
      ) : (
        // Multi-section Discovery Home Feed
        <div className="space-y-10 sm:space-y-12">
          {/* Spotlight Hero Player (if user selects a video or default) */}
          {featured ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
                    <Flame className="h-4 w-4" />
                  </span>
                  <h2 className="font-display text-lg font-bold sm:text-xl">
                    Tiêu điểm nổi bật
                  </h2>
                </div>
                <ViewToggle view={view} onChange={changeView} />
              </div>
              <FeaturedPlayer
                ref={featuredRef}
                item={featured}
                onMinimizeToggle={() => setMiniOpen(true)}
              />
            </section>
          ) : null}

          {/* Section 1: Trending Feed */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-500/15 text-orange-500">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                  {interests.length > 0 ? "Đề xuất theo sở thích của bạn" : "Đang thịnh hành hôm nay"}
                </h2>
              </div>
              {!featured ? <ViewToggle view={view} onChange={changeView} /> : null}
            </div>

            {isLoading && items.length === 0 ? (
              <VideoGridSkeleton count={8} view={view} />
            ) : (
              <VideoGrid
                items={featured ? rest.slice(0, 8) : items.slice(0, 8)}
                view={view}
                onPlay={playItem}
                onToggleWatchLater={watchLater.toggle}
                isInWatchLater={watchLater.has}
                activeId={featuredId}
              />
            )}
          </section>

          {/* Section 2: Music Curated Section */}
          {musicItems.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500/15 text-rose-500">
                    <Music className="h-4 w-4" />
                  </span>
                  <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                    Âm nhạc nổi bật
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setChip("Âm nhạc");
                    setQuery("Âm nhạc");
                  }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Xem thêm
                </button>
              </div>

              <VideoGrid
                items={musicItems}
                view="grid"
                onPlay={playItem}
                onToggleWatchLater={watchLater.toggle}
                isInWatchLater={watchLater.has}
              />
            </section>
          )}

          {/* Section 3: Tech & Programming Curated Section */}
          {techItems.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-500/15 text-indigo-500">
                    <Terminal className="h-4 w-4" />
                  </span>
                  <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                    Công nghệ & Lập trình
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setChip("Lập trình");
                    setQuery("Lập trình");
                  }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Xem thêm
                </button>
              </div>

              <VideoGrid
                items={techItems}
                view="grid"
                onPlay={playItem}
                onToggleWatchLater={watchLater.toggle}
                isInWatchLater={watchLater.has}
              />
            </section>
          )}

          {/* Section 4: All Trending remaining videos */}
          {items.length > 8 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500">
                    <Compass className="h-4 w-4" />
                  </span>
                  <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                    Khám phá thêm
                  </h2>
                </div>
              </div>

              <VideoGrid
                items={items.slice(8)}
                view={view}
                onPlay={playItem}
                onToggleWatchLater={watchLater.toggle}
                isInWatchLater={watchLater.has}
                activeId={featuredId}
              />

              <div ref={sentinelRef} className="py-4 text-center">
                {isLoadingMore && (
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Đang tải thêm video...</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Floating Watch Later Panel */}
      <WatchLaterPanel
        items={watchLater.items}
        currentId={featuredId}
        onPlay={playItem}
        onRemove={watchLater.remove}
        onClear={watchLater.clear}
      />

      {/* Sticky Mini Player when scrolled */}
      {featured && miniOpen && (
        <MiniPlayer
          item={featured}
          onClose={() => setMiniOpen(false)}
          onExpand={() => {
            setMiniOpen(false);
            featuredRef.current?.scrollIntoView();
          }}
        />
      )}
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
      className="flex items-center gap-0.5 rounded-xl border border-border/80 bg-card/60 p-0.5 backdrop-blur"
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={view === "grid"}
        aria-label="Hiển thị dạng lưới"
        className={cn(
          "grid h-7 w-8 place-items-center rounded-lg transition",
          view === "grid"
            ? "bg-foreground text-background shadow-sm"
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
          "grid h-7 w-8 place-items-center rounded-lg transition",
          view === "list"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
