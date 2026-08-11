"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { VideoGrid } from "@/components/video-grid";
import { MiniPlayer } from "@/components/mini-player";
import { FilterChips } from "@/components/filter-chips";
import { VideoFiltersBar } from "@/components/video-filters";
import { WatchLaterPanel } from "@/components/watch-later-panel";
import { useWatchLater } from "@/hooks/use-watch-later";
import {
  DEFAULT_FILTERS,
  filtersToSearchParams,
  type VideoFilters,
} from "@/lib/filters";
import { cn } from "@/lib/utils";

const STORAGE_INTERESTS = "xemphim:interests";
const STORAGE_LAST_TOPIC = "xemphim:lastTopic";
const STORAGE_LAST_MODE = "xemphim:lastMode";

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
  const [query, setQuery] = useState(""); // committed search term
  const [chip, setChip] = useState<string | null>(null);
  const [filters, setFilters] = useState<VideoFilters>(DEFAULT_FILTERS);

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

  const requestSeq = useRef(0);
  const featuredRef = useRef<FeaturedPlayerHandle>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const watchLater = useWatchLater();

  // A chip always wins over the free-text query so the two never fight.
  const activeTopic = chip ?? query;
  const mode: Mode =
    activeTopic.trim().length >= 2 || interests.length > 0 ? "search" : "trending";

  useEffect(() => {
    const p = readPersisted();
    setInterests(p.interests);
    setTopicInput(p.topic);
    setQuery(p.mode === "search" ? p.topic : "");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writePersisted({ interests, topic: activeTopic, mode });
  }, [interests, activeTopic, mode, hydrated]);

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
        if (seq !== requestSeq.current) return; // a newer request superseded us

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

  // Reload from scratch whenever the query, chip, interests or filters change.
  useEffect(() => {
    if (!hydrated) return;
    void load(null);
  }, [hydrated, query, chip, interests, filters, load]);

  // Infinite scroll: fetch the next page when the sentinel scrolls into view.
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
  const rest = useMemo(
    () => items.filter((v) => v.id !== featuredId),
    [items, featuredId],
  );

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

  const status = toStatus({ activeTopic: responseTopic, items, error, isLoading });

  function resetToTrending() {
    setChip(null);
    setQuery("");
    setTopicInput("");
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="space-y-8">
      <Hero />

      <Glass intensity="strong" className="space-y-5 p-5 sm:p-6 glow-soft animate-in-up">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            const t = topicInput.trim();
            if (t.length < 2 && interests.length === 0) return;
            setChip(null);
            setQuery(t);
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo từ khoá tuỳ ý (không bắt buộc)..."
              className="glass-input h-11 pl-10 text-base"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              maxLength={100}
            />
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

        <VideoFiltersBar value={filters} onChange={setFilters} disabled={isLoading} />

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

      <StatusMessage status={status} onRetry={() => void load(null)} />

      {featured ? (
        <section
          className={cn(
            "space-y-3 transition-all duration-300",
            theater &&
              "-mx-4 rounded-3xl bg-black/50 px-4 py-5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10",
          )}
        >
          <div className="flex items-center justify-end gap-2">
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
            >
              {theater ? (
                <>
                  <Minimize2 className="mr-1 h-4 w-4" /> Thoát rạp phim
                </>
              ) : (
                <>
                  <Maximize2 className="mr-1 h-4 w-4" /> Chế độ rạp phim
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
            activeId={featuredId}
            onPlay={playItem}
            onToggleWatchLater={watchLater.toggle}
            isInWatchLater={watchLater.has}
          />

          {/* Infinite-scroll sentinel */}
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
  // Keep showing the current results while a "load more" request is in flight.
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
        <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          Khám phá video YouTube
          <br />
          <span className="text-gradient">theo cách của bạn.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
          Chọn vài sở thích, hệ thống tự động tìm và đề xuất video xu hướng từ YouTube.
          Lưu video yêu thích vào nhiều danh sách để xem lại bất cứ lúc nào.
        </p>
      </div>
    </section>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function StatusMessage({ status, onRetry }: { status: SearchStatus; onRetry: () => void }) {
  if (status.kind === "idle" || status.kind === "ready") return null;
  if (status.kind === "loading") {
    return (
      <div className="space-y-3" aria-live="polite">
        <p className="text-sm text-muted-foreground">Đang tải đề xuất...</p>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="overflow-hidden rounded-2xl glass">
              <Skeleton className="aspect-video w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </li>
          ))}
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
