"use client";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export function RenameRoomButton({
  title,
  disabled,
  onSave,
}: {
  title: string;
  disabled: boolean;
  onSave: (title: string) => Promise<void>;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(title);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) {
          setDraft(title.slice(0, 80));
          setError("");
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          disabled={disabled}
          aria-label={t("Đổi tên phòng")}
          title={t("Đổi tên phòng")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Đổi tên phòng")}</DialogTitle>
          <DialogDescription>
            {t(
              "Tên phòng được cập nhật cho tất cả thành viên, không ảnh hưởng video đang phát.",
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending || disabled || !draft.trim()) return;
            setPending(true);
            setError("");
            try {
              await onSave(draft.trim());
              setOpen(false);
            } catch (err) {
              setError(
                t(
                  err instanceof Error
                    ? err.message
                    : "Không gọi được máy chủ.",
                ),
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium">{t("Tên phòng")}</span>
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={80}
              required
              disabled={pending}
              autoFocus
            />
            <span className="block text-xs text-muted-foreground">
              {draft.length}/80
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {t("Hủy")}
            </Button>
            <Button
              type="submit"
              disabled={pending || disabled || !draft.trim()}
            >
              {pending ? t("Đang lưu…") : t("Lưu tên phòng")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
