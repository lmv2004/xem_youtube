"use client";
import { useTranslations } from "@/components/locale-provider";
import { useState } from "react";
import Link from "next/link";

import { ListVideo, Play, Trash2, X } from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  items: VideoItem[];
  currentId?: string | null;
  onPlay: (item: VideoItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

/** Compact queue with the same stored list as the full watch-later library. */
export function WatchLaterPanel({
  items,
  currentId,
  onPlay,
  onRemove,
  onClear,
}: Props) {
  const t = useTranslations();
  const [clearOpen, setClearOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-display text-sm sm:text-base font-bold text-foreground">
          <ListVideo className="h-4 w-4 text-rose-500" />
          {t("Hàng đợi xem sau")}{" "}
          <Badge
            variant="secondary"
            className="h-5 rounded-full px-1.5 text-[11px] font-bold"
          >
            {items.length}
          </Badge>
        </h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setClearOpen(true)}
          className="rounded-xl text-xs text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> {t("Xoá hết")}{" "}
        </Button>
      </div>

      <Link
        href="/watch-later"
        className="inline-flex min-h-10 items-center text-sm font-medium text-primary hover:underline"
      >
        {t("Quản lý danh sách xem sau")}
      </Link>
      <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {items.map((item) => {
          const playing = item.id === currentId;
          return (
            <li
              key={item.id}
              className={cn(
                "group flex items-center gap-3 rounded-xl p-2 transition-all duration-200",
                playing
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : "hover:bg-muted",
              )}
            >
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-black/80 shadow"
                aria-label={t("Phát ") + item.title}
              >
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Play className="h-4 w-4 fill-white text-white" />
                </span>
                {item.durationSeconds > 0 ? (
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[10px] font-semibold text-white">
                    {formatDuration(item.durationSeconds)}
                  </span>
                ) : null}
              </button>

              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
                  {item.title}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {item.channel}
                </p>
                {playing ? (
                  <span className="text-xs font-semibold text-primary">
                    {t("Đang phát")}{" "}
                  </span>
                ) : null}
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onRemove(item.id)}
                aria-label={t("Xoá khỏi hàng đợi")}
                className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Xóa danh sách xem sau?")}</DialogTitle>
            <DialogDescription>
              {t(
                "Tất cả video sẽ bị xóa khỏi danh sách trên trình duyệt này. Bộ sưu tập và lịch sử xem vẫn được giữ nguyên.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              {t("Hủy")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onClear();
                setClearOpen(false);
              }}
            >
              {t("Xóa toàn bộ")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
