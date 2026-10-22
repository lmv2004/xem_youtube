"use client";
import { useTranslations } from "@/components/locale-provider";
import {
  ArrowUp,
  ArrowDown,
  ListVideo,
  SkipForward,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import type { RoomQueueItem } from "@/lib/rooms";

export function RoomQueue({
  items,
  disabled,
  canContribute,
  pending,
  onRemove,
  onMove,
  onNext,
  onSearch,
}: {
  items: RoomQueueItem[];
  disabled: boolean;
  canContribute: boolean;
  pending: boolean;
  onRemove: (id: string) => void;
  onNext: () => void;
  onSearch: () => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const t = useTranslations();
  return (
    <section
      className="flex h-[min(580px,70dvh)] min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-card lg:h-[620px]"
      aria-label={t("Danh sách chờ")}
    >
      <div className="space-y-2 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            {t("Tiếp theo ·")} {items.length}/50
          </h3>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled || pending || !items.length}
            onClick={onNext}
          >
            <SkipForward className="mr-1 h-4 w-4" /> {t("Bài kế tiếp")}{" "}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("Tự phát lần lượt khi video hiện tại kết thúc.")}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {!items.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <ListVideo className="h-9 w-9 text-muted-foreground" />
            <p className="text-sm font-medium">{t("Hàng đợi đang trống")}</p>
            <p className="max-w-60 text-xs text-muted-foreground">
              {t("Tìm video và chọn “Thêm vào hàng đợi” để xem liên tục.")}
            </p>
            <Button size="sm" variant="outline" onClick={onSearch}>
              {t("Tìm video")}
            </Button>
          </div>
        ) : (
          <ol className="space-y-2">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="grid grid-cols-[20px_64px_minmax(0,1fr)] items-center gap-2 rounded-xl border border-border p-3 first:border-primary/30 first:bg-primary/5"
              >
                <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">
                  {index + 1}
                </span>
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-16 rounded-md object-cover"
                  />
                ) : (
                  <div className="aspect-video w-16 rounded-md bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.channel}
                    {item.duration > 0
                      ? ` · ${formatDuration(item.duration)}`
                      : ""}
                  </p>
                  {index === 0 && (
                    <span className="text-xs text-primary">
                      {t("Sắp phát")}
                    </span>
                  )}
                </div>
                <div className="col-span-3 flex items-center justify-end gap-1 border-t border-border/60 pt-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label={t("Đưa {p0} lên", { p0: item.title })}
                    disabled={disabled || pending || index === 0}
                    onClick={() => onMove(item.id, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label={t("Đưa {p0} xuống", { p0: item.title })}
                    disabled={disabled || pending || index === items.length - 1}
                    onClick={() => onMove(item.id, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={t("Xóa {p0} khỏi hàng đợi", { p0: item.title })}
                    disabled={disabled || pending}
                    onClick={() => onRemove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      {disabled && (
        <p className="border-t border-border p-3 text-xs text-muted-foreground">
          {t(
            canContribute
              ? "Bạn có thể thêm video ở mục Tìm video. Chủ phòng sắp xếp, xóa và chuyển bài."
              : "Kết nối lại hoặc chờ chủ phòng mở quyền để sửa hàng đợi.",
          )}
        </p>
      )}
    </section>
  );
}
