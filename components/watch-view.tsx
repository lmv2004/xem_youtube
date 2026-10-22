"use client";
import { useTranslations } from "@/components/locale-provider";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Maximize2,
  Minimize2,
  Keyboard,
  RotateCcw,
  Share2,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import type { VideoItem } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";
import { WatchPlayer } from "@/components/watch-player";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  readWatchProgress,
  removeWatchProgress,
  saveWatchProgress,
  timestampShareUrl,
} from "@/lib/watch-progress";
import type { WatchPlayerApi } from "@/lib/youtube-player-api";
import { Button } from "@/components/ui/button";
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog";
import { useCreateRoom } from "@/hooks/use-create-room";
import { useToast } from "@/hooks/use-toast";
import { useWatchLater } from "@/hooks/use-watch-later";
import { cn } from "@/lib/utils";

const AUTOPLAY_STORAGE_KEY = "xemphim:autoplay";
const THEATER_STORAGE_KEY = "xemphim:default_theater";

type Props = {
  video: VideoItem;
  relatedVideos: VideoItem[];
  loop?: boolean;
  startTimestamp?: number | null;
};

export function WatchView({
  video,
  relatedVideos,
  loop = false,
  startTimestamp = null,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const { createRoom, isCreating } = useCreateRoom();
  const watchLater = useWatchLater();

  const [descExpanded, setDescExpanded] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [showStickyMini, setShowStickyMini] = useState(false);
  const [startSeconds, setStartSeconds] = useState(0);
  const [resumeSeconds, setResumeSeconds] = useState(0);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [shareSeconds, setShareSeconds] = useState(0);
  const [shareBase, setShareBase] = useState("");

  const playerRef = useRef<HTMLDivElement | null>(null);
  const playerApi = useRef<WatchPlayerApi | null>(null);

  // Load autoplay + default-theater preferences before mounting the player.
  useEffect(() => {
    try {
      const storedAutoplay = localStorage.getItem(AUTOPLAY_STORAGE_KEY);
      setAutoplay(storedAutoplay === null || storedAutoplay === "1");
      if (localStorage.getItem(THEATER_STORAGE_KEY) === "1") {
        setTheaterMode(true);
      }
    } catch {
      /* ignore */
    }
    const explicitStart = startTimestamp;
    const saved = readWatchProgress().find(
      (entry) => entry.video.id === video.id,
    );
    setStartSeconds(explicitStart ?? saved?.positionSeconds ?? 0);
    setResumeSeconds(
      explicitStart === null ? (saved?.positionSeconds ?? 0) : 0,
    );
    if (explicitStart !== null) playerApi.current?.seekTo(explicitStart, true);
    setPreferencesReady(true);
  }, [video.id, startTimestamp]);

  // Record view history on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    void fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: video }),
    }).catch(() => {
      /* ignore history network failure */
    });
  }, [video, session?.user?.id]);

  // Track scroll position to show sticky mini-player if scrolled past
  useEffect(() => {
    const handleScroll = () => {
      if (!playerRef.current) return;
      const rect = playerRef.current.getBoundingClientRect();
      setShowStickyMini(rect.bottom < 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleAutoplay = () => {
    const next = !autoplay;
    setAutoplay(next);
    try {
      localStorage.setItem(AUTOPLAY_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const onPlayerReady = useCallback((player: WatchPlayerApi | null) => {
    playerApi.current = player;
  }, []);
  const onProgress = useCallback(
    (seconds: number, duration: number) =>
      saveWatchProgress(video, seconds, duration),
    [video],
  );

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          "input, textarea, select, button, a, [contenteditable]:not([contenteditable='false']), [role='textbox'], [role='dialog'], [role='menu']",
        )
      )
        return;
      if (
        collectionOpen ||
        shortcutsOpen ||
        shareOpen ||
        document.querySelector('[role="dialog"]')
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "?") {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (key === "t") {
        event.preventDefault();
        setTheaterMode((value) => !value);
        return;
      }
      const player = playerApi.current;
      if (!player) return;
      if (["k", " ", "j", "l", "arrowleft", "arrowright", "m"].includes(key))
        event.preventDefault();
      if (key === "k" || key === " ") {
        if (player.getPlayerState() === 1) player.pauseVideo();
        else player.playVideo();
      } else if (key === "j" || key === "arrowleft")
        player.seekTo(
          Math.max(0, player.getCurrentTime() - (key === "j" ? 10 : 5)),
          true,
        );
      else if (key === "l" || key === "arrowright")
        player.seekTo(
          Math.min(
            player.getDuration() || Infinity,
            player.getCurrentTime() + (key === "l" ? 10 : 5),
          ),
          true,
        );
      else if (key === "m") {
        if (player.isMuted()) player.unMute();
        else player.mute();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [collectionOpen, shortcutsOpen, shareOpen]);

  const handleShare = () => {
    setShareSeconds(
      Math.floor(playerApi.current?.getCurrentTime() ?? startSeconds),
    );
    setShareBase(window.location.href);
    setShareOpen(true);
  };
  const shareUrl = shareBase
    ? includeTimestamp
      ? timestampShareUrl(shareBase, shareSeconds)
      : (() => {
          const url = new URL(shareBase);
          url.searchParams.delete("t");
          url.searchParams.delete("start");
          url.hash = "";
          return url.toString();
        })()
    : "";
  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: t("Đã sao chép liên kết video"),
        description: video.title,
      });
    } catch {
      toast({
        title: t("Không thể sao chép liên kết"),
        description: t("Bạn có thể chọn và sao chép liên kết bên trên."),
        variant: "destructive",
      });
    }
  };

  const isQueued = watchLater.has(video.id);

  const publishedDateFormatted = video.publishedAt
    ? new Date(video.publishedAt).toLocaleDateString(t.locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div
      className={cn(
        "mx-auto min-w-0 space-y-7",
        theaterMode ? "max-w-[1440px]" : "max-w-7xl",
      )}
    >
      {/* Main Grid: Video Player + Suggestions Sidebar */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-7 xl:grid-cols-12">
        {/* Left Column: Player Stage & Video Info */}
        <div
          className={cn(
            theaterMode ? "xl:col-span-12" : "xl:col-span-8",
            "min-w-0 space-y-5",
          )}
        >
          <div className="relative">
            <div
              ref={playerRef}
              className="relative overflow-hidden rounded-xl border border-border bg-black shadow-sm sm:rounded-2xl"
            >
              {preferencesReady ? (
                <WatchPlayer
                  key={video.id}
                  video={video}
                  autoPlay={autoplay}
                  loop={loop}
                  startSeconds={startSeconds}
                  onReady={onPlayerReady}
                  onProgress={onProgress}
                />
              ) : (
                <div
                  className="aspect-video min-h-[200px] animate-pulse bg-muted"
                  role="status"
                  aria-label={t("Đang chuẩn bị trình phát")}
                />
              )}
            </div>
          </div>

          {resumeSeconds > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2 text-sm">
              <span>
                {t("Tiếp tục từ {p0}", { p0: formatDuration(resumeSeconds) })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartSeconds(0);
                  setResumeSeconds(0);
                  removeWatchProgress(video.id);
                  playerApi.current?.seekTo(0, true);
                }}
              >
                <RotateCcw className="h-4 w-4" />
                {t("Xem từ đầu")}
              </Button>
            </div>
          )}

          {/* Video Title */}
          <h1 className="text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
            {video.title}
          </h1>

          {/* Channel Info & Actions Bar */}
          <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Channel Info */}
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {video.channel.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground text-sm sm:text-base">
                  {video.channel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {video.viewCount > 0
                    ? formatViews(video.viewCount, t.locale)
                    : ""}
                  {video.viewCount > 0 && publishedDateFormatted ? " • " : ""}
                  {publishedDateFormatted}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Watch Later */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  watchLater.toggle(video);
                  toast({
                    title: isQueued
                      ? t("Đã xoá khỏi Xem sau")
                      : t("Đã thêm vào Xem sau"),
                  });
                }}
                aria-pressed={isQueued}
                className={cn(
                  "min-h-11 rounded-full border border-border gap-1.5",
                  isQueued && "border-primary/30 bg-primary/10 text-primary",
                )}
                title={t("Lưu vào danh sách xem sau")}
              >
                {isQueued ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{t("Đã lưu")}</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>{t("Xem sau")} </span>
                  </>
                )}
              </Button>

              {/* Watch Together */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isCreating}
                onClick={() => void createRoom(video)}
                className="min-h-11 rounded-full border border-border gap-1.5 hover:text-primary"
                title={t("Tạo phòng xem chung cùng bạn bè")}
              >
                <Users className="h-4 w-4" />
                <span>{t("Xem cùng")}</span>
              </Button>

              {/* Add Collection */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCollectionOpen(true)}
                className="min-h-11 rounded-full border border-border gap-1.5 hover:bg-muted"
                title={t("Lưu vào thư viện")}
              >
                <BookmarkPlus className="h-4 w-4" />
                <span>{t("Lưu vào thư viện")}</span>
              </Button>

              {/* Share */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleShare}
                className="min-h-11 rounded-full border border-border gap-1.5 hover:bg-muted"
                title={t("Chia sẻ video")}
              >
                <Share2 className="h-4 w-4" />
                <span>{t("Chia sẻ")}</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShortcutsOpen(true)}
              className="min-h-11 text-xs"
            >
              <Keyboard />
              {t("Phím tắt")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheaterMode((value) => !value)}
              aria-pressed={theaterMode}
              className="min-h-11 text-xs"
            >
              {theaterMode ? <Minimize2 /> : <Maximize2 />}
              {theaterMode
                ? t("Thu nhỏ chế độ rạp chiếu")
                : t("Chế độ rạp chiếu phim")}
            </Button>
          </div>

          {/* Expandable Description */}
          {video.description && (
            <div className="rounded-xl bg-muted/60 p-4">
              <div
                className={cn(
                  "text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words",
                  !descExpanded && "line-clamp-3",
                )}
              >
                {video.description}
              </div>
              <button
                type="button"
                onClick={() => setDescExpanded(!descExpanded)}
                aria-expanded={descExpanded}
                className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-semibold hover:underline"
              >
                {descExpanded ? (
                  <>
                    <span>{t("Thu gọn")}</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>{t("Xem thêm mô tả")}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Suggested Next Videos */}
        <div
          className={cn(
            theaterMode ? "xl:col-span-12" : "xl:col-span-4",
            "min-w-0 space-y-4",
          )}
        >
          <div className="flex items-center justify-between pb-1">
            <h2 className="font-display text-base sm:text-lg font-bold">
              {t("Video tiếp theo")}{" "}
            </h2>
            {/* Autoplay Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={autoplay}
              onClick={toggleAutoplay}
              className="flex min-h-11 items-center gap-2 rounded-lg text-xs text-muted-foreground hover:text-foreground"
            >
              <span>{t("Phát khi mở video")}</span>
              <span
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  autoplay ? "bg-primary" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                    autoplay ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </span>
            </button>
          </div>

          {/* Suggestions List */}
          <div
            className={cn(
              "grid gap-4",
              theaterMode && "sm:grid-cols-2 xl:grid-cols-3",
            )}
          >
            {!relatedVideos.length && (
              <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                {t("Chưa có video gợi ý.")}{" "}
                <Link
                  href="/"
                  className="font-medium text-primary hover:underline"
                >
                  {t("Khám phá thêm")}{" "}
                </Link>
              </p>
            )}
            {relatedVideos.map((item) => (
              <Link
                key={item.id}
                href={`/watch/${item.id}`}
                className="group flex min-w-0 gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <div className="relative aspect-video w-[42%] max-w-44 shrink-0 self-start overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] text-white">
                    {formatDuration(item.durationSeconds)}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.channel}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatViews(item.viewCount, t.locale)}
                  </p>
                </div>
              </Link>
            ))}

            {/* Jump straight into a watch party with the first suggestion. */}
            {relatedVideos.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const next = relatedVideos[0];
                  if (next) router.push(`/watch/${next.id}`);
                }}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {t("Phát video đầu tiên trong danh sách")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Mini Player when scrolled past */}
      {showStickyMini && (
        <aside
          aria-label={t("Quay lại video đang xem")}
          className="fixed bottom-24 right-4 z-40 hidden w-72 overflow-hidden rounded-xl border border-border bg-card shadow-xl sm:block"
        >
          <div className="flex items-center justify-between p-3">
            <p className="truncate text-xs font-semibold text-foreground pr-2">
              {video.title}
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                playerRef.current?.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "auto"
                    : "smooth",
                });
              }}
              className="h-7 px-2.5 text-xs rounded-lg"
            >
              {t("Về video")}{" "}
            </Button>
          </div>
        </aside>
      )}

      {/* Collection Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Chia sẻ video")}</DialogTitle>
            <DialogDescription>
              {t("Gửi liên kết để bạn bè xem đúng khoảnh khắc.")}
            </DialogDescription>
          </DialogHeader>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={includeTimestamp}
              onChange={(event) => setIncludeTimestamp(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            {t("Bắt đầu tại {p0}", {
              p0: formatDuration(shareSeconds) || "0:00",
            })}
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span>{t("Liên kết video")}</span>
            <input
              readOnly
              value={shareUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="h-11 w-full rounded-lg border border-input bg-muted px-3 text-sm font-normal"
            />
          </label>
          <Button onClick={() => void copyShare()}>
            <Copy />
            {t("Sao chép liên kết")}
          </Button>
          {shareOpen &&
            typeof navigator !== "undefined" &&
            typeof navigator.share === "function" && (
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator
                    .share({ title: video.title, url: shareUrl })
                    .catch((error: unknown) => {
                      if (
                        !(error instanceof Error && error.name === "AbortError")
                      )
                        void copyShare();
                    });
                }}
              >
                <Share2 />
                {t("Chia sẻ")}
              </Button>
            )}
        </DialogContent>
      </Dialog>
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Phím tắt trình phát")}</DialogTitle>
            <DialogDescription>
              {t(
                "Dùng khi không nhập văn bản. Khi đang ở trong video, phím tắt YouTube sẽ được áp dụng.",
              )}
            </DialogDescription>
          </DialogHeader>
          <dl className="divide-y divide-border text-sm">
            {[
              ["K / Space", "Phát / tạm dừng"],
              ["J / L", "Lùi / tiến 10 giây"],
              ["← / →", "Lùi / tiến 5 giây"],
              ["M", "Bật / tắt tiếng"],
              ["T", "Chế độ rạp chiếu phim"],
              ["?", "Mở hướng dẫn phím tắt"],
            ].map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 py-3"
              >
                <dt>{t(label)}</dt>
                <dd>
                  <kbd className="whitespace-nowrap rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs">
                    {key}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
      {collectionOpen && (
        <AddToCollectionDialog
          open={collectionOpen}
          onOpenChange={setCollectionOpen}
          item={video}
        />
      )}
    </div>
  );
}
