"use client";
import { useTranslations } from "@/components/locale-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Lock, Play, ListPlus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDuration } from "@/lib/format";
import type { VideoItem, VideoSearchResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  onPick: (item: VideoItem) => Promise<void> | void;
  onEnqueue: (item: VideoItem) => Promise<void> | void;
  activeVideoId?: string | null;
  /** True when the host locked control: browsing stays open, switching does not. */
  disabled?: boolean;
  /** Adding to the queue can remain available while immediate playback is locked. */
  enqueueDisabled?: boolean;
  locked?: boolean;
};

/**
 * Search / suggestions panel inside a room. Reuses the existing `/api/videos`
 * endpoint: with no query it returns the trending list, which doubles as the
 * suggestion feed.
 */
export function RoomSearch({
  onPick,
  onEnqueue,
  activeVideoId,
  disabled = false,
  enqueueDisabled = disabled,
  locked = false,
}: Props) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<VideoItem[]>([]);
  const [heading, setHeading] = useState(t("Đề xuất cho phòng"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);

  // Guards against a slow earlier request overwriting a newer one.
  const seqRef = useRef(0);

  const run = useCallback(
    async (topic: string) => {
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
        setHeading(json.topic || t("Kết quả"));
        setError(json.error?.message ?? null);
      } catch {
        if (seq === seqRef.current) setError(t("Không gọi được máy chủ."));
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void run("");
  }, [run]);

  const pick = async (item: VideoItem, enqueue = false) => {
    if (enqueue) {
      await onEnqueue(item);
      return;
    }
    setPickingId(item.id);
    try {
      await (enqueue ? onEnqueue(item) : onPick(item));
    } finally {
      setPickingId(null);
    }
  };

  return (
    <div className="flex h-[min(580px,70dvh)] min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-card lg:h-[620px]">
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
          placeholder={t("Tìm video để phát trong phòng...")}
          className="h-11"
          aria-label={t("Tìm video")}
        />
        <Button
          type="submit"
          size="icon"
          className="h-11 w-11 shrink-0"
          aria-label={t("Tìm video")}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      {locked ? (
        <p className="flex items-start gap-1.5 border-b border-border bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t(
            enqueueDisabled
              ? "Chủ phòng đang khoá điều khiển. Bạn vẫn xem được đề xuất nhưng chưa đổi được video."
              : "Chủ phòng giữ điều khiển. Bạn có thể thêm video vào hàng đợi.",
          )}{" "}
        </p>
      ) : null}

      <div className="flex items-center gap-1.5 px-3 pt-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        {heading}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
        {error ? (
          <p className="pt-6 text-center text-sm text-muted-foreground">
            {t(error ?? "")}
          </p>
        ) : items.length === 0 && !loading ? (
          <p className="pt-6 text-center text-sm text-muted-foreground">
            {t("Không có kết quả nào.")}{" "}
          </p>
        ) : (
          items.map((item) => {
            const isActive = item.id === activeVideoId;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex gap-2 rounded-xl border border-transparent p-1.5 transition",
                  isActive
                    ? "border-primary/40 bg-primary/5"
                    : "hover:bg-foreground/5",
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
                  <p className="line-clamp-2 text-sm font-medium leading-snug">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.channel}
                    {item.durationSeconds > 0
                      ? " · " + formatDuration(item.durationSeconds)
                      : ""}
                  </p>

                  <div className="mt-auto flex flex-wrap gap-1 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="min-h-9 text-xs"
                      disabled={enqueueDisabled || pickingId !== null}
                      onClick={() => void pick(item, true)}
                    >
                      <ListPlus className="mr-1 h-3 w-3" />{" "}
                      {t("Thêm vào hàng đợi")}{" "}
                    </Button>
                    {isActive ? (
                      <span className="text-[11px] font-medium text-primary">
                        {t("Đang phát trong phòng")}{" "}
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="min-h-9 text-xs"
                        disabled={disabled || pickingId !== null}
                        onClick={() => void pick(item)}
                      >
                        {pickingId === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : disabled ? (
                          <Lock className="mr-1 h-3 w-3" />
                        ) : (
                          <Play className="mr-1 h-3 w-3" />
                        )}
                        {t("Phát ngay")}{" "}
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
