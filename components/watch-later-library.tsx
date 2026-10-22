"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Play,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { useWatchLater } from "@/hooks/use-watch-later";
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
import { formatDuration } from "@/lib/format";

export function WatchLaterLibrary() {
  const t = useTranslations();
  const { items, hydrated, remove, clear, move } = useWatchLater();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("custom");
  const [clearOpen, setClearOpen] = useState(false);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const result = items.filter(
      (item) =>
        !query ||
        `${item.title} ${item.channel}`.toLocaleLowerCase().includes(query),
    );
    if (sort === "title")
      result.sort((a, b) => a.title.localeCompare(b.title, t.locale));
    if (sort === "reverse") result.reverse();
    return result;
  }, [items, search, sort, t.locale]);
  const canReorder = sort === "custom" && !search.trim();

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-start">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Bookmark className="h-4 w-4" />
            {t("Thư viện của bạn")}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t("Xem sau")}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t(
              "Lưu video để xem khi bạn có thời gian. Danh sách được lưu trên trình duyệt này, không cần đăng nhập.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filtered.length > 0 && (
            <Button asChild>
              <Link href={`/watch/${filtered[0].id}`}>
                <Play className="mr-2 h-4 w-4" />
                {t("Bắt đầu xem")}
              </Link>
            </Button>
          )}
          {items.length > 0 && (
            <Button variant="outline" onClick={() => setClearOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t("Xóa toàn bộ")}
            </Button>
          )}
        </div>
      </header>

      {!hydrated ? (
        <div
          role="status"
          className="rounded-2xl border bg-card p-8 text-center text-muted-foreground"
        >
          {t("Đang tải danh sách xem sau...")}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card px-5 py-14 text-center">
          <span className="rounded-2xl bg-primary/10 p-4 text-primary">
            <Bookmark className="h-7 w-7" />
          </span>
          <h2 className="text-xl font-semibold">
            {t("Để dành một video hay cho lần tới")}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {t(
              "Nhấn biểu tượng Xem sau trên video để lưu vào đây. Bạn có thể sắp xếp và xem lại bất cứ lúc nào.",
            )}
          </p>
          <Button asChild>
            <Link href="/">{t("Khám phá video ngay")}</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label={t("Tìm trong danh sách xem sau")}
                placeholder={t("Tìm video hoặc kênh...")}
                className="h-11 bg-card pl-10 pr-10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label={t("Xóa bộ lọc")}
                  className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label={t("Sắp xếp video")}
              className="h-11 rounded-xl border bg-card px-3 text-sm"
            >
              <option value="custom">{t("Thứ tự của bạn")}</option>
              <option value="reverse">{t("Đảo thứ tự")}</option>
              <option value="title">{t("Tên video (A-Z)")}</option>
            </select>
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {t("{count} video trong danh sách", { count: filtered.length })}
            {canReorder && (
              <span className="mt-1 block text-xs">
                {t("Dùng mũi tên để đổi thứ tự xem.")}
              </span>
            )}
          </p>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border bg-card p-10 text-center">
              <h2 className="font-semibold">
                {t("Không tìm thấy video phù hợp")}
              </h2>
              <Button
                className="mt-3"
                variant="outline"
                onClick={() => setSearch("")}
              >
                {t("Xóa bộ lọc")}
              </Button>
            </div>
          ) : (
            <ol className="space-y-3">
              {filtered.map((item) => {
                const index = items.findIndex((video) => video.id === item.id);
                return (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 sm:flex-nowrap sm:gap-4"
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
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/watch/${item.id}`}
                        className="line-clamp-2 text-sm font-semibold leading-relaxed hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {item.channel}
                      </p>
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      {canReorder && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={index === 0}
                            onClick={() => move(item.id, -1)}
                            aria-label={t("Đưa lên trên: {title}", {
                              title: item.title,
                            })}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={index === items.length - 1}
                            onClick={() => move(item.id, 1)}
                            aria-label={t("Đưa xuống dưới: {title}", {
                              title: item.title,
                            })}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(item.id)}
                        aria-label={t("Xóa khỏi xem sau: {title}", {
                          title: item.title,
                        })}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
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
                clear();
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
