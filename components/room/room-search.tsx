"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/format";
import type { VideoItem, VideoSearchResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  onPick: (item: VideoItem) => Promise<void> | void;
  activeVideoId?: string | null;
};

/**
 * Search / suggestions panel inside a room. Reuses the existing `/api/videos`
 * endpoint: with no query it returns the trending list, which doubles as the
 * suggestion feed.
 */
export function RoomSearch({ onPick, activeVideoId }: Props) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<VideoItem[]>([]);
  const [heading, setHeading] = useState("Đề xuất cho phòng");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);

  // Guards against a slow earlier request overwriting a newer one.
  const seqRef = useRef(0);

  const run = useCallback(async (topic: string) => {
    const seq = seqRef.current + 1;
    seqRef.current = seq;
    setLoading(true);
    setError(null);

    try {
      const trimmed = topic.trim();
      const qs =
        trimmed.length >= 2
          ? "?topic=" + encodeURIComponent(trimmed)
          : "?mode=trending";
      const res = await fetch("/api/videos" + qs, { cache: "no-store" });
      const json = (await res.json()) as VideoSearchResponse;
      if (seq !== seqRef.current) return;

      setItems(json.items ?? []);
      setHeading(json.topic || "Kết quả");
      setError(json.error?.message ?? null);
    } catch {
      if (seq === seqRef.current) setError("Không gọi được máy chủ.");
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run("");
  }, [run]);

  const pick = async (item: VideoItem) => {
    setPickingId(item.id);
    try {
      await onPick(item);
    } finally {
      setPickingId(null);
    }
  };

  return (
    <div className="flex h-[420px] flex-col rounded-2xl border border-border bg-card lg:h-[560px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="flex gap-2 border-b border-border p-3"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm video để phát trong phòng..."
          className="h-9"
        />
        <Button type="submit" size="icon" className="h-9 w-9" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      <div className="flex items-center gap-1.5 px-3 pt-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        {heading}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {error ? (
          <p className="pt-6 text-center text-sm text-muted-foreground">{error}</p>
        ) : items.length === 0 && !loading ? (
          <p className="pt-6 text-center text-sm text-muted-foreground">
            Không có kết quả nào.
          </p>
        ) : (
          items.map((item) => {
            const isActive = item.id === activeVideoId;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex gap-2 rounded-xl border border-transparent p-1.5 transition",
                  isActive ? "border-primary/40 bg-primary/5" : "hover:bg-foreground/5",
                )}
              >
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-24 shrink-0 rounded-lg object-cover"
                  />
                ) : null}

                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="line-clamp-2 text-xs font-medium leading-snug">
                    {item.title}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.channel}
                    {item.durationSeconds > 0
                      ? " · " + formatDuration(item.durationSeconds)
                      : ""}
                  </p>

                  <div className="mt-auto pt-1">
                    {isActive ? (
                      <span className="text-[11px] font-medium text-primary">
                        Đang phát trong phòng
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={pickingId !== null}
                        onClick={() => void pick(item)}
                      >
                        {pickingId === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="mr-1 h-3 w-3" />
                        )}
                        Phát cho cả phòng
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
