"use client";
import { useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { youtubeLinkVideo } from "@/lib/youtube-link";
import { useTranslations } from "@/components/locale-provider";
import {
  Loader2,
  Link2,
  ArrowUp,
  ArrowDown,
  ListVideo,
  SkipForward,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import type { RoomQueueItem } from "@/lib/rooms";

export function RoomQueue({
  fillHeight = false,
  items,
  disabled,
  canContribute,
  pending,
  onRemove,
  onMove,
  onNext,
  onSearch,
  onAddLink,
}: {
  fillHeight?: boolean;
  items: RoomQueueItem[];
  disabled: boolean;
  canContribute: boolean;
  pending: boolean;
  onRemove: (id: string) => void;
  onNext: () => void;
  onSearch: () => void;
  onAddLink: (link: string) => Promise<boolean>;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const t = useTranslations();
  const inputId = useId();
  const [link, setLink] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const revision = useRef(0);
  const submitting = useRef(false);
  async function submitLink(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || !canContribute || items.length >= 50) return;
    const submitted = link.trim();
    if (!youtubeLinkVideo(submitted)) {
      setError(t("Liên kết YouTube không hợp lệ."));
      return;
    }
    const submittedRevision = revision.current;
    submitting.current = true;
    setAdding(true);
    setError("");
    try {
      const added = await onAddLink(submitted);
      if (added && revision.current === submittedRevision) {
        setLink("");
        revision.current++;
      }
      if (!added) setError(t("Chưa thêm được video. Vui lòng thử lại."));
    } catch {
      setError(t("Chưa thêm được video. Vui lòng thử lại."));
    } finally {
      submitting.current = false;
      setAdding(false);
    }
  }
  return (
    <section
      className={cn(
        "flex h-[min(580px,70dvh)] min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-card lg:h-[620px]",
        fillHeight && "lg:h-full lg:min-h-0",
      )}
      aria-label={t("Danh sách chờ")}
    >
      <div className="shrink-0 space-y-2 border-b border-border p-3">
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
      <form
        onSubmit={submitLink}
        className="shrink-0 space-y-2 border-b border-border p-3"
        aria-busy={adding}
      >
        <label
          htmlFor={inputId}
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <Link2 aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          {t("Thêm bằng link YouTube")}
        </label>
        <div className="flex items-center gap-2">
          <Input
            id={inputId}
            value={link}
            type="text"
            inputMode="url"
            autoComplete="off"
            maxLength={2048}
            placeholder="https://youtu.be/..."
            disabled={!canContribute}
            aria-invalid={Boolean(error)}
            aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ""}`}
            className="min-w-0 flex-1"
            onChange={(event) => {
              revision.current++;
              setLink(event.target.value);
              setError("");
            }}
          />
          <Button
            type="submit"
            disabled={
              !canContribute || adding || !link.trim() || items.length >= 50
            }
            className="shrink-0 px-3"
          >
            {adding && (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            )}
            {t(adding ? "Đang thêm…" : "Thêm")}
          </Button>
        </div>
        <p
          id={`${inputId}-hint`}
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {t(
            "Dán link để thêm trực tiếp, không cần tìm kiếm. Nếu chưa tải được tiêu đề, video sẽ hiển thị bằng mã YouTube.",
          )}
        </p>
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-destructive"
          >
            {error}
          </p>
        )}
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {!items.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <ListVideo className="h-9 w-9 text-muted-foreground" />
            <p className="text-sm font-medium">{t("Hàng đợi đang trống")}</p>
            <p className="max-w-60 text-xs text-muted-foreground">
              {t("Dán link YouTube ở trên hoặc tìm video để thêm vào hàng đợi.")}
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
        <p className="shrink-0 border-t border-border p-3 text-xs text-muted-foreground">
          {t(
            canContribute
              ? "Bạn có thể dán link hoặc tìm video để thêm. Chủ phòng sắp xếp, xóa và chuyển bài."
              : "Kết nối lại hoặc chờ chủ phòng mở quyền để sửa hàng đợi.",
          )}
        </p>
      )}
    </section>
  );
}
