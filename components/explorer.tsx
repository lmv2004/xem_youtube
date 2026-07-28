"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { SearchStatus, VideoItem, VideoSearchResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { InterestPicker } from "@/components/interest-picker";
import { FeaturedPlayer } from "@/components/featured-player";
import { VideoGrid } from "@/components/video-grid";

const STORAGE_INTERESTS = "xemphim:interests";
const STORAGE_LAST_TOPIC = "xemphim:lastTopic";
const STORAGE_LAST_MODE = "xemphim:lastMode"; // "trending" | "search"

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

export function Explorer() {
  const [interests, setInterests] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<Mode>("trending");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<VideoSearchResponse | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // Used to avoid race conditions when the user clicks rapidly.
  const requestSeq = useRef(0);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const p = readPersisted();
    setInterests(p.interests);
    setTopic(p.topic);
    setMode(p.mode);
    setHydrated(true);
  }, []);

  // Persist whenever the user changes interests/topic/mode.
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
        if (opts.mode === "trending") {
          params.set("mode", "trending");
        } else {
          const t = opts.topic.trim();
          if (t) params.set("topic", t);
          if (opts.interests.length > 0) params.set("interests", opts.interests.join(","));
        }
        const url = `/api/videos?${params.toString()}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as VideoSearchResponse;
        if (seq !== requestSeq.current) return; // stale response
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

  // Auto-run after hydration and whenever the user changes interests.
  useEffect(() => {
    if (!hydrated) return;
    void runSearch({ topic, interests, mode });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interests, hydrated, mode]);

  const status = toStatus(data?.topic ?? "", data, isLoading);
  const ready = status.kind === "ready" ? status : null;
  const rest: VideoItem[] = ready ? ready.items.filter((v) => v.id !== ready.featuredId) : [];
  const featured = ready ? ready.items.find((v) => v.id === ready.featuredId) : null;

  function resetToTrending() {
    setTopic("");
    setMode("trending");
    // interests kept (user preference) — only last search context is cleared
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="space-y-5 p-5">
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
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm theo từ khoá tuỳ ý (không bắt buộc)..."
                className="pl-9"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={100}
              />
            </div>
            <Button type="submit" disabled={isLoading || (topic.trim().length < 2 && interests.length === 0)}>
              {isLoading ? "Đang tìm..." : "Tìm video"}
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={mode === "trending" ? "default" : "secondary"}>
              {mode === "trending" ? "Đề xuất chính" : data?.topic ?? "Đã tìm"}
            </Badge>
            {mode === "search" ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetToTrending}>
                <X className="mr-1" /> Quay lại đề xuất chính
              </Button>
            ) : null}
          </div>

          <InterestPicker value={interests} onChange={setInterests} />
        </CardContent>
      </Card>

      <StatusMessage status={status} onRetry={() => void runSearch({ topic, interests, mode })} />

      {featured ? <FeaturedPlayer item={featured} /> : null}
      {rest.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            {mode === "trending" ? "Đang thịnh hành" : "Đề xuất liên quan"}
          </h2>
          <VideoGrid
            items={rest}
            onPlay={(item) =>
              setData({
                ...(data as VideoSearchResponse),
                items: [item, ...(ready?.items.filter((i) => i.id !== item.id) ?? [])],
                featuredId: item.id,
                topic: data?.topic ?? "",
              })
            }
          />
        </section>
      ) : null}
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
            <li key={i} className="overflow-hidden rounded-lg border border-border bg-card">
              <Skeleton className="aspect-video w-full" />
              <div className="space-y-2 p-3">
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
      <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
        Không tìm thấy video cho chủ đề <strong>{status.topic}</strong>. Thử chủ đề khác nhé.
      </div>
    );
  }
  if (status.kind === "missing-key") {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
        Máy chủ chưa được cấu hình <code className="rounded bg-muted px-1">YOUTUBE_API_KEY</code>.
        Thêm biến này vào <code className="rounded bg-muted px-1">.env.local</code> rồi khởi động
        lại <code className="rounded bg-muted px-1">npm run dev</code>.
      </div>
    );
  }
  if (status.kind === "error") {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <p className="font-medium text-destructive">Không thể tải video.</p>
        <p className="mt-1 text-muted-foreground">{status.message}</p>
        <Button size="sm" variant="outline" className="mt-2" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  }
  return null;
}
