"use client";

import {
  ListVideo,
  Loader2,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import type { usePersonalPlaylist } from "@/hooks/use-personal-playlist";
import { adjacentPlaylistVideo, playlistIndex } from "@/lib/personal-playlist";
import { cn } from "@/lib/utils";

export function PersonalPlaylistPanel({
  controller,
  videoId,
}: {
  controller: ReturnType<typeof usePersonalPlaylist>;
  videoId: string;
}) {
  const t = useTranslations();
  const { playlist, pending } = controller;
  if (controller.missing)
    return (
      <aside
        className="rounded-xl border bg-muted/50 p-4 text-sm"
        aria-label={t("Danh sách phát cá nhân")}
      >
        <p role="status">
          {t("Danh sách phát không còn trong phiên này. Bạn vẫn có thể xem video hoặc mở lại danh sách từ thư viện.")}
        </p>
        <Button variant="ghost" size="sm" onClick={controller.exit} className="mt-2">
          {t("Xem video riêng")}
        </Button>
      </aside>
    );
  if (!playlist) return null;
  const index = playlistIndex(playlist, videoId);
  const byId = new Map(playlist.items.map((item) => [item.id, item]));
  return (
    <aside
      className="min-w-0 overflow-hidden rounded-xl border bg-card"
      aria-label={t("Danh sách phát cá nhân")}
    >
      <div className="flex min-w-0 items-center gap-3 px-4 pt-3">
        <ListVideo className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {playlist.title || t("Danh sách phát cá nhân")}
          </p>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {t("Video {current} / {total}", {
              current: index + 1,
              total: playlist.order.length,
            })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={controller.exit}
          aria-label={t("Thoát danh sách phát")}
        >
          <X />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1 px-3 pb-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || !adjacentPlaylistVideo(playlist, videoId, -1)}
          onClick={controller.previous}
          className="min-h-11"
        >
          <SkipBack />{t("Video trước")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || !adjacentPlaylistVideo(playlist, videoId, 1)}
          onClick={controller.next}
          className="min-h-11"
        >
          {pending ? <Loader2 className="animate-spin" /> : <SkipForward />}
          {t("Video kế tiếp")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={controller.shuffle}
          aria-pressed={playlist.shuffled}
          className={cn("min-h-11", playlist.shuffled && "bg-accent text-accent-foreground ring-1 ring-inset ring-border")}
        >
          <Shuffle />{t("Xáo trộn")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={controller.repeat}
          aria-pressed={playlist.repeat}
          className={cn("min-h-11", playlist.repeat && "bg-accent text-accent-foreground ring-1 ring-inset ring-border")}
        >
          <Repeat />{t("Lặp danh sách")}
        </Button>
      </div>
      {(controller.finished || controller.storageUnavailable || pending) && (
        <p role="status" className="border-t px-4 py-3 text-xs text-muted-foreground">
          {pending ? t("Đang chuyển video…") : controller.finished ? t("Đã phát hết danh sách.") : t("Trình duyệt đang chặn lưu trữ. Tải lại trang có thể mất danh sách phát.")}
        </p>
      )}
      {controller.navigationFailed && (
        <div role="alert" className="border-t px-4 py-3 text-sm">
          <p>{t("Chưa chuyển được video. Kiểm tra kết nối và thử lại.")}</p>
          <Button variant="outline" size="sm" onClick={controller.retry} className="mt-2">
            {t("Thử lại")}
          </Button>
        </div>
      )}
      <details className="border-t">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
          {t("Xem danh sách phát")}
        </summary>
        <ol className="max-h-72 overflow-y-auto overscroll-contain px-2 pb-2">
          {playlist.order.map((id, itemIndex) => {
            const item = byId.get(id)!;
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => controller.select(id)}
                  aria-current={id === videoId ? "true" : undefined}
                  aria-label={t("Phát {p0}", { p0: item.title })}
                  className={cn(
                    "flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60",
                    id === videoId && "bg-accent text-accent-foreground ring-1 ring-inset ring-border",
                  )}
                >
                  <span className="w-5 shrink-0 text-center text-xs tabular-nums">{itemIndex + 1}</span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.channel}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </details>
    </aside>
  );
}
