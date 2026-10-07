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
  pending,
  onRemove,
  onMove,
  onNext,
  onSearch,
}: {
  items: RoomQueueItem[];
  disabled: boolean;
  pending: boolean;
  onRemove: (id: string) => void;
  onNext: () => void;
  onSearch: () => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const t = useTranslations();
  return (
    <section
      className="flex h-[420px] flex-col rounded-2xl border border-border bg-card lg:h-[560px]"
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
      <div className="flex-1 overflow-y-auto p-3">
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
                className="flex items-center gap-2 rounded-xl bg-foreground/5 p-2"
              >
                <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">
                  {index + 1}
                </span>
                {item.thumbnail /* eslint-disable-next-line @next/next/no-img-element */ && (
                  <img
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-16 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-medium">
                    {item.title}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.channel}
                    {item.duration > 0
                      ? ` · ${formatDuration(item.duration)}`
                      : ""}
                  </p>
                  {index === 0 && (
                    <span className="text-[11px] text-primary">
                      {t("Sắp phát")}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={t("Đưa {p0} lên", { p0: item.title })}
                    disabled={disabled || pending || index === 0}
                    onClick={() => onMove(item.id, "up")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={t("Đưa {p0} xuống", { p0: item.title })}
                    disabled={disabled || pending || index === items.length - 1}
                    onClick={() => onMove(item.id, "down")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={t("Xóa {p0} khỏi hàng đợi", { p0: item.title })}
                  disabled={disabled || pending}
                  onClick={() => onRemove(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </div>
      {disabled && (
        <p className="border-t border-border p-3 text-xs text-muted-foreground">
          {t("Kết nối lại hoặc chờ chủ phòng mở quyền để sửa hàng đợi.")}
        </p>
      )}
    </section>
  );
}
