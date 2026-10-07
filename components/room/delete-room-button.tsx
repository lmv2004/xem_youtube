"use client";
import { useTranslations } from "@/components/locale-provider";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function DeleteRoomButton({
  code,
  title,
  onDeleted,
}: {
  code: string;
  title: string;
  onDeleted: () => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const remove = async () => {
    setPending(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${code}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const json = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          json?.message ?? t("Không thể xóa phòng. Vui lòng thử lại."),
        );
      }
      setOpen(false);
      toast({
        title: t("Đã xóa phòng"),
        description: t("Liên kết cũ không còn sử dụng được."),
      });
      onDeleted();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("Không kết nối được máy chủ."),
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          aria-label={t("Xóa phòng {p0}", { p0: title })}
          onClick={() => setError("")}
        >
          <Trash2 className="mr-1.5 h-4 w-4" /> {t("Xóa phòng")}{" "}
        </Button>
      </DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById(`cancel-delete-${code}`)?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("Xóa phòng này?")}</DialogTitle>
          <DialogDescription>
            {t("Phòng “")}
            {title}” ({code}
            {t(
              ") sẽ đóng với tất cả thành viên. Lịch sử trò chuyện sẽ bị xóa và không thể khôi phục.",
            )}{" "}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t(error ?? "")}
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button
            id={`cancel-delete-${code}`}
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            {t("Giữ lại phòng")}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => void remove()}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? t("Đang xóa…") : t("Xóa phòng")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
