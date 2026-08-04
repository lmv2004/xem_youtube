"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlayCircle, Search, Sparkles, X } from "lucide-react";
import type { SearchStatus, VideoItem, VideoSearchResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Glass } from "@/components/ui/glass";
import { Skeleton } from "@/components/ui/skeleton";
import { InterestPicker } from "@/components/interest-picker";
import { FeaturedPlayer, type FeaturedPlayerHandle } from "@/components/featured-player";
import { VideoGrid } from "@/components/video-grid";
import { MiniPlayer } from "@/components/mini-player";

const STORAGE_INTERESTS = "xemphim:interests";
const STORAGE_LAST_TOPIC = "xemphim:lastTopic";
const STORAGE_LAST_MODE = "xemphim:lastMode";

type Mode = "trending" | "search";

type Persisted = {
  interests: string[];
  topic: string;
  mode: Mode;
};

function readPersisted(): Persisted {
  if (typeof window === "undefined") {
    return { interests: [], topic: "", mode: "trending" };
  }
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

function toStatus(
  topic: string,
  data: VideoSearchResponse | null,
  isLoading: boolean,
): SearchStatus {
  if (isLoading) return { kind: "loading", topic };
  if (!data) return { kind: "idle" };
  if (data.error?.code === "missing-key") return { kind: "missing-key" };
  if (data.error) {
    return { kind: "error", topic, code: data.error.code, message: data.error.message };
  }
  if (data.items.length === 0) return { kind: "empty", topic };
  return { kind: "ready", topic, items: data.items, featuredId: data.featuredId };
}

export function HeroExplorer() {
  const [interests, setInterests] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<Mode>("trending");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<VideoSearchResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const requestSeq = useRef(0);
  const featuredRef = useRef<FeaturedPlayerHandle>(null);
  const [miniOpen, setMiniOpen] = useState(false);

  useEffect(() => {
    const p = readPersisted();
    setInterests(p.interests);
    setTopic(p.topic);
    setMode(p.mode);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writePersisted({ interests, topic, mode });
  }, [interests, topic, mode, hydrated]);

  const runSearch = useCallback(
    async (opts: { topic: string; interests: string[]; mode: Mode }) => {
      const seq = ++requestSeq.current;
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        const t = opts.topic.trim();
        const hasSearch = t.length >= 2 || opts.interests.length > 0;
        if (opts.mode === "trending" && !hasSearch) {
          params.set("mode", "trending");
        } else {
          if (t) params.set("topic", t);
          if (opts.interests.length > 0) params.set("interests", opts.interests.join(","));
        }
        const url = `/api/videos?${params.toString()}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as VideoSearchResponse;
        if (seq !== requestSeq.current) return;
        setData(json);
      } catch {
        if (seq !== requestSeq.current) return;
        setData({
          topic: opts.topic,
          items: [],
          featuredId: null,
          error: { code: "network", message: "Không thể gọi máy chủ." },
        });
      } finally {
        if (seq === requestSeq.current) setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!hydrated) return;
    void runSearch({ topic, interests, mode: interests.length > 0 || topic.trim().length >= 2 ? "search" : "trending" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interests, hydrated]);

  const status = toStatus(data?.topic ?? "", data, isLoading);
  const ready = status.kind === "ready" ? status : null;
  const rest: VideoItem[] = ready ? ready.items.filter((v) => v.id !== ready.featuredId) : [];
  const featured = ready ? ready.items.find((v) => v.id === ready.featuredId) : null;

  function resetToTrending() {
    setTopic("");
    setMode("trending");
  }

  return (
    <div className="space-y-8">
      <Hero />

      <Glass intensity="strong" className="space-y-5 p-5 sm:p-6 glow-soft animate-in-up">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (topic.trim().length < 2 && interests.length === 0) return;
            setMode("search");
            void runSearch({ topic, interests, mode: "search" });
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo từ khoá tuỳ ý (không bắt buộc)..."
              className="glass-input h-11 pl-10 text-base"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={100}
            />
          </div>
          <Button type="submit" size="lg" className="glow-primary" disabled={isLoading || (topic.trim().length < 2 && interests.length === 0)}>
            {isLoading ? "Đang tìm..." : "Tìm video"}
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-white/5 text-foreground ring-1 ring-white/10"
          >
            {mode === "trending" ? (
              <>
                <Sparkles className="mr-1 h-3 w-3 text-primary" /> Đề xuất chính
              </>
            ) : (
              <>
                <PlayCircle className="mr-1 h-3 w-3 text-primary" /> {data?.topic ?? "Đã tìm"}
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

      <StatusMessage status={status} onRetry={() => void runSearch({ topic, interests, mode })} />

      {featured ? (
        <FeaturedPlayer
          ref={featuredRef}
          item={featured}
          minimized={miniOpen}
          onMinimizeToggle={() => setMiniOpen((v) => !v)}
        />
      ) : null}
      {rest.length > 0 ? (
        <section className="space-y-4 animate-in-up">
          <SectionHeading
            title={mode === "trending" ? "Đang thịnh hành" : "Đề xuất liên quan"}
            subtitle={mode === "trending" ? "Tự động theo khu vực Việt Nam" : `Gợi ý cho "${data?.topic ?? ""}"`}
          />
          <VideoGrid
            items={rest}
            onPlay={(item) => {
              setData({
                ...(data as VideoSearchResponse),
                items: [item, ...(ready?.items.filter((i) => i.id !== item.id) ?? [])],
                featuredId: item.id,
                topic: data?.topic ?? "",
              });
              setMiniOpen(false);
              // Smooth scroll back to the featured player so the user sees
              // the video they just clicked.
              requestAnimationFrame(() => {
                featuredRef.current?.scrollIntoView();
              });
            }}
          />
        </section>
      ) : null}

      <MiniPlayer
        item={miniOpen ? (featured ?? null) : null}
        onClose={() => setMiniOpen(false)}
        onExpand={() => {
          setMiniOpen(false);
          requestAnimationFrame(() => featuredRef.current?.scrollIntoView());
        }}
      />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate animate-in-up">
      <div className="space-y-3 text-center">
        <Badge
          variant="secondary"
          className="mx-auto inline-flex w-fit bg-white/5 text-foreground ring-1 ring-white/10"
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
  if (status.kind === "idle") return null;
  if (status.kind === "loading") {
    return (
      <div className="space-y-3" aria-live="polite">
        <p className="text-sm text-muted-foreground">Đang tải đề xuất...</p>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
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
        Không tìm thấy video cho chủ đề <strong>{status.topic}</strong>. Thử chủ đề khác nhé.
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
