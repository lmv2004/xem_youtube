"use client";

import { useCallback, useState } from "react";
import type { SearchStatus, VideoSearchResponse } from "@/lib/types";
import { FeaturedPlayer } from "./featured-player";
import { VideoCard } from "./video-card";
import { StatusPanel } from "./status";

type Props = {
  suggestions: ReadonlyArray<string>;
};

function toStatus(topic: string, data: VideoSearchResponse | null, isLoading: boolean): SearchStatus {
  if (isLoading) return { kind: "loading", topic };
  if (!data) return { kind: "idle" };
  if (data.error?.code === "missing-key") return { kind: "missing-key" };
  if (data.error) {
    return { kind: "error", topic, code: data.error.code, message: data.error.message };
  }
  if (data.items.length === 0) return { kind: "empty", topic };
  return { kind: "ready", topic, items: data.items, featuredId: data.featuredId };
}

export function TopicExplorer({ suggestions }: Props) {
  const [topic, setTopic] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<VideoSearchResponse | null>(null);

  const submit = useCallback(
    async (rawTopic: string) => {
      const trimmed = rawTopic.trim();
      if (trimmed.length < 2) return;
      setIsLoading(true);
      setActiveTopic(trimmed);
      try {
        const res = await fetch(`/api/videos?topic=${encodeURIComponent(trimmed)}`);
        const json = (await res.json()) as VideoSearchResponse;
        setData(json);
      } catch {
        setData({
          topic: trimmed,
          items: [],
          featuredId: null,
          error: { code: "network", message: "Không thể gọi máy chủ. Kiểm tra mạng và thử lại." },
        });
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const status = toStatus(activeTopic, data, isLoading);
  const ready = status.kind === "ready" ? status : null;
  const rest = ready ? ready.items.filter((v) => v.id !== ready.featuredId) : [];

  return (
    <section className="flex flex-col gap-8">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(topic);
        }}
      >
        <label className="sr-only" htmlFor="topic-input">
          Chủ đề
        </label>
        <input
          id="topic-input"
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Ví dụ: nhạc acoustic, phim ngắn, học lập trình..."
          className="w-full flex-1 rounded-lg border border-ink/15 bg-white/80 px-4 py-3 text-base shadow-sm placeholder:text-muted focus:bg-white"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={100}
          aria-describedby="topic-help"
        />
        <button
          type="submit"
          className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:bg-accent disabled:opacity-50"
          disabled={isLoading || topic.trim().length < 2}
        >
          {isLoading ? "Đang tìm..." : "Tìm video"}
        </button>
        <p id="topic-help" className="sr-only">
          Nhập chủ đề rồi nhấn Tìm video. Có thể chọn gợi ý bên dưới.
        </p>
      </form>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setTopic(s);
              void submit(s);
            }}
            className="rounded-full border border-ink/15 bg-panel px-3 py-1.5 text-xs font-medium text-ink transition hover:border-accent hover:text-accent"
          >
            {s}
          </button>
        ))}
      </div>

      <StatusPanel status={status} onRetry={() => void submit(activeTopic)} />

      {ready?.featuredId ? (
        <FeaturedPlayer
          item={ready.items.find((v) => v.id === ready.featuredId)!}
        />
      ) : null}

      {ready && rest.length > 0 ? (
        <div className="space-y-4">
          <h2 className="font-display text-xl sm:text-2xl">Đề xuất liên quan</h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((v) => (
              <li key={v.id}>
                <VideoCard item={v} onPlay={(id) => {
                  // Promote to featured by re-submitting a topic variant; here we just open the watch URL.
                  window.open(`https://www.youtube.com/watch?v=${id}`, "_blank", "noopener,noreferrer");
                }} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
