"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, History, Play, Search, Trash2, X } from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { useTranslations } from "@/components/locale-provider";
import { formatDuration } from "@/lib/format";
import { formatDistanceToNow } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export type HistoryItem = VideoItem & {
  historyId: string;
  watchedAt: string;
  topic?: string;
};

function groupTimeline(items: HistoryItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const groups: { label: string; items: HistoryItem[] }[] = [
    { label: "Hôm nay", items: [] },
    { label: "Hôm qua", items: [] },
    { label: "Tuần này", items: [] },
    { label: "Cũ hơn", items: [] },
  ];
  for (const item of items) {
    const date = new Date(item.watchedAt);
    groups[
      date >= today ? 0 : date >= yesterday ? 1 : date >= lastWeek ? 2 : 3
    ].items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

export function HistoryList({ initialItems }: { initialItems: HistoryItem[] }) {
  const t = useTranslations();
  const { toast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState<string[]>([]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return items.filter(
      (item) =>
        !query ||
        `${item.title} ${item.channel}`.toLocaleLowerCase().includes(query),
    );
  }, [items, search]);
  const timelineGroups = useMemo(() => groupTimeline(filtered), [filtered]);

  async function deleteItem(historyId: string) {
    if (deleting.includes(historyId) || clearing) return;
    setDeleting((current) => [...current, historyId]);
    try {
      const response = await fetch(
        `/api/history?id=${encodeURIComponent(historyId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("delete-failed");
      setItems((current) =>
        current.filter((item) => item.historyId !== historyId),
      );
      toast({ title: t("Đã xóa video khỏi lịch sử") });
    } catch {
      toast({
        title: t("Không thể xóa lịch sử"),
        description: t("Dữ liệu vẫn được giữ nguyên. Vui lòng thử lại."),
        variant: "destructive",
      });
    } finally {
      setDeleting((current) => current.filter((id) => id !== historyId));
    }
  }

  async function clearAllHistory() {
    if (clearing || deleting.length) return;
    setClearing(true);
    try {
      const response = await fetch("/api/history?all=true", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("clear-failed");
      setItems([]);
      setClearOpen(false);
      toast({ title: t("Đã xóa toàn bộ lịch sử xem") });
    } catch {
      toast({
        title: t("Không thể xóa lịch sử"),
        description: t("Dữ liệu vẫn được giữ nguyên. Vui lòng thử lại."),
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" role="status">
          {t("{count} video trong lịch sử", { count: items.length })}
        </p>
        {items.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setClearOpen(true)}
            disabled={clearing || deleting.length > 0}
            className="self-start"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("Xóa toàn bộ")}
          </Button>
        )}
      </div>
      {items.length > 0 && (
        <div className="relative max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t("Tìm kiếm trong lịch sử xem...")}
            placeholder={t("Tìm kiếm trong lịch sử xem...")}
            className="h-11 bg-card pl-10 pr-11"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t("Xóa bộ lọc")}
              className="absolute right-0 top-0 grid h-11 w-11 place-items-center"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      {items.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed bg-card px-5 py-14 text-center">
          <History className="mx-auto h-8 w-8 text-primary" />
          <h2 className="text-xl font-semibold">
            {t("Lịch sử xem đang trống")}
          </h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            {t(
              "Khi bạn phát các video trên XemPhim khi đã đăng nhập, chúng sẽ tự động được ghi nhớ tại đây.",
            )}
          </p>
          <Button asChild>
            <Link href="/">{t("Khám phá video ngay")}</Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="space-y-3 rounded-2xl border bg-card p-10 text-center">
          <h2 className="font-semibold">{t("Không tìm thấy video phù hợp")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("Hãy thử tìm với từ khóa khác.")}
          </p>
          <Button variant="outline" onClick={() => setSearch("")}>
            {t("Xóa bộ lọc")}
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {timelineGroups.map((group) => (
            <section key={group.label} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4 text-primary" />
                {t(group.label)}
                <span className="font-normal text-muted-foreground">
                  ({group.items.length})
                </span>
              </h2>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li
                    key={item.historyId}
                    className="flex flex-wrap items-start gap-3 rounded-2xl border bg-card p-3 sm:flex-nowrap sm:items-center sm:gap-4"
                  >
                    <Link
                      href={`/watch/${item.id}`}
                      aria-label={t("Phát ") + item.title}
                      className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-44"
                    >
                      {item.thumbnail && (
                        <Image
                          unoptimized
                          width={640}
                          height={360}
                          src={item.thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                      {item.durationSeconds > 0 && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/85 px-1 text-[11px] text-white">
                          {formatDuration(item.durationSeconds)}
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Link
                        href={`/watch/${item.id}`}
                        className="line-clamp-2 text-sm font-semibold leading-relaxed hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.channel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("Đã xem")}{" "}
                        <time dateTime={item.watchedAt}>
                          {formatDistanceToNow(item.watchedAt, t.locale)}
                        </time>
                      </p>
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/watch/${item.id}`}>
                          <Play className="mr-1.5 h-3.5 w-3.5" />
                          {t("Xem lại")}
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={clearing || deleting.includes(item.historyId)}
                        aria-label={t("Xóa khỏi lịch sử: {title}", {
                          title: item.title,
                        })}
                        onClick={() => void deleteItem(item.historyId)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <Dialog
        open={clearOpen}
        onOpenChange={(open) => {
          if (!clearing) setClearOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Xác nhận xóa toàn bộ lịch sử?")}</DialogTitle>
            <DialogDescription>
              {t(
                "Thao tác này sẽ xóa tất cả các video đã lưu trong lịch sử xem của bạn. Hành động này không thể hoàn tác.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={clearing}
              onClick={() => setClearOpen(false)}
            >
              {t("Hủy")}
            </Button>
            <Button
              variant="destructive"
              disabled={clearing}
              onClick={() => void clearAllHistory()}
            >
              {clearing ? t("Đang xóa...") : t("Xóa vĩnh viễn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
