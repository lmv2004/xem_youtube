"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Pencil, Play, Search, Trash2 } from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { useTranslations } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type Props = {
  collectionId: string;
  collectionName: string;
  items: VideoItem[];
};

export function CollectionManager({
  collectionId,
  collectionName,
  items,
}: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(collectionName);
  const [renamePending, setRenamePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const busy = renamePending || deletePending || removeId !== null;
  const remaining = items.filter((item) => !removedIds.includes(item.id));
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const result = items.filter(
      (item) =>
        !removedIds.includes(item.id) &&
        (!query ||
          `${item.title} ${item.channel}`.toLocaleLowerCase().includes(query)),
    );
    if (sort === "title")
      result.sort((a, b) => a.title.localeCompare(b.title, t.locale));
    if (sort === "oldest") result.reverse();
    return result;
  }, [items, removedIds, search, sort, t.locale]);

  function showError(message: string) {
    toast({
      variant: "destructive",
      title: t(message),
      description: t("Dữ liệu vẫn được giữ nguyên. Vui lòng thử lại."),
    });
  }

  async function rename(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim() || busy) return;
    setRenamePending(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!response.ok) throw new Error("rename-failed");
      toast({ title: t("Đã cập nhật") });
      setRenameOpen(false);
      router.refresh();
    } catch {
      showError("Không thể đổi tên.");
    } finally {
      setRenamePending(false);
    }
  }

  async function deleteCollection() {
    if (busy) return;
    setDeletePending(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("delete-failed");
      toast({ title: t("Đã xoá") });
      router.push("/favorites?tab=collections");
      router.refresh();
    } catch {
      showError("Không thể xoá.");
    } finally {
      setDeletePending(false);
    }
  }

  async function removeItem(videoId: string) {
    if (busy) return;
    setRemoveId(videoId);
    try {
      const response = await fetch(
        `/api/collections/${collectionId}/items/${videoId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("remove-failed");
      setRemovedIds((current) => [...current, videoId]);
      router.refresh();
    } catch {
      showError("Không thể xoá video.");
    } finally {
      setRemoveId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b pb-5">
        {filtered.length > 0 && (
          <Button asChild>
            <Link href={`/watch/${filtered[0].id}`}>
              <Play className="mr-2 h-4 w-4" />
              {t("Bắt đầu xem")}
            </Link>
          </Button>
        )}
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setNewName(collectionName);
            setRenameOpen(true);
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {t("Đổi tên")}
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("Xoá danh sách")}
        </Button>
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={t("Tìm trong bộ sưu tập")}
              placeholder={t("Tìm video hoặc kênh...")}
              className="h-11 bg-card pl-10"
            />
          </div>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label={t("Sắp xếp video")}
            className="h-11 rounded-xl border bg-card px-3 text-sm"
          >
            <option value="newest">{t("Mới lưu nhất")}</option>
            <option value="oldest">{t("Lưu cũ nhất")}</option>
            <option value="title">{t("Tên video (A-Z)")}</option>
          </select>
        </div>
      )}
      <p className="text-sm text-muted-foreground" role="status">
        {t("{count} video trong bộ sưu tập", { count: filtered.length })}
      </p>
      {filtered.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed bg-card px-5 py-12 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-primary" />
          <h2 className="text-xl font-semibold">
            {remaining.length === 0
              ? t("Bộ sưu tập đang trống")
              : t("Không tìm thấy video phù hợp")}
          </h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {remaining.length === 0
              ? t("Thêm video vào bộ sưu tập từ trang xem để tìm lại dễ dàng.")
              : t("Hãy thử tìm với từ khóa khác.")}
          </p>
          {remaining.length === 0 ? (
            <Button asChild>
              <Link href="/">{t("Khám phá video ngay")}</Link>
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setSearch("")}>
              {t("Xóa bộ lọc")}
            </Button>
          )}
        </div>
      ) : (
        <ul className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id} className="min-w-0">
              <Link
                href={`/watch/${item.id}`}
                aria-label={t("Phát ") + item.title}
                className="relative block aspect-video overflow-hidden rounded-xl bg-muted"
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
                  <span className="absolute bottom-2 right-2 rounded bg-black/85 px-1.5 text-xs text-white">
                    {formatDuration(item.durationSeconds)}
                  </span>
                )}
              </Link>
              <div className="space-y-1 pt-3">
                <Link
                  href={`/watch/${item.id}`}
                  className="line-clamp-2 text-sm font-semibold leading-relaxed hover:text-primary"
                >
                  {item.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {item.channel}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void removeItem(item.id)}
                  className="-ml-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {removeId === item.id
                    ? t("Đang xoá...")
                    : t("Bỏ khỏi danh sách")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          if (!renamePending) setRenameOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Đổi tên danh sách")}</DialogTitle>
            <DialogDescription>
              {t("Chọn một tên dễ nhớ cho bộ sưu tập của bạn.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={rename} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="collection-rename">{t("Tên mới")}</Label>
              <Input
                id="collection-rename"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                maxLength={80}
                disabled={renamePending}
                required
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={renamePending}
                onClick={() => setRenameOpen(false)}
              >
                {t("Hủy")}
              </Button>
              <Button type="submit" disabled={renamePending || !newName.trim()}>
                {renamePending ? t("Đang lưu...") : t("Lưu")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deletePending) setDeleteOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Xóa bộ sưu tập?")}</DialogTitle>
            <DialogDescription>
              {t(
                "Bộ sưu tập “{name}” sẽ bị xóa. Thao tác này không thể hoàn tác.",
                { name: collectionName },
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={deletePending}
              onClick={() => setDeleteOpen(false)}
            >
              {t("Hủy")}
            </Button>
            <Button
              variant="destructive"
              disabled={deletePending}
              onClick={() => void deleteCollection()}
            >
              {deletePending ? t("Đang xóa...") : t("Xoá danh sách")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
