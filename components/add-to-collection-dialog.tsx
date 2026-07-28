"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { reportClientError } from "@/lib/client-log";

type Collection = { id: string; name: string; slug: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: VideoItem;
};

function summarizeItem(item: VideoItem) {
  return {
    id: item.id,
    title: item.title,
    channel: item.channel,
    thumbnailLen: item.thumbnail.length,
    durationSeconds: item.durationSeconds,
    viewCount: item.viewCount,
    embedUrl: item.embedUrl,
    watchUrl: item.watchUrl,
    publishedAt: item.publishedAt,
    descriptionLen: item.description.length,
  };
}

export function AddToCollectionDialog({ open, onOpenChange, item }: Props) {
  const { data: session } = useSession();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!session) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/collections", { cache: "no-store" });
      if (!res.ok) {
        reportClientError("add-to-collection", "fetch collections failed", { status: res.status });
        return;
      }
      const json = (await res.json()) as { items: Collection[] };
      if (!cancelled) setCollections(json.items);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, session]);

  async function addTo(collectionId: string) {
    setPendingId(collectionId);
    reportClientError("add-to-collection", "add to existing click", {
      collectionId,
      item: summarizeItem(item),
    });
    const res = await fetch(`/api/collections/${collectionId}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ item }),
    });
    setPendingId(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      reportClientError("add-to-collection", "add to existing failed", {
        collectionId,
        status: res.status,
        message: data.message,
        sent: summarizeItem(item),
      });
      toast({ variant: "destructive", title: "Lỗi", description: data.message ?? "Không thể lưu." });
      return;
    }
    toast({ title: "Đã lưu", description: "Video đã được thêm vào danh sách." });
    onOpenChange(false);
  }

  async function createAndAdd() {
    const name = newName.trim();
    if (!name) return;
    setLoading(true);
    reportClientError("add-to-collection", "create + add click", {
      name,
      item: summarizeItem(item),
    });
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      reportClientError("add-to-collection", "create collection failed", {
        status: res.status,
        message: data.message,
      });
      toast({ variant: "destructive", title: "Lỗi", description: data.message ?? "Không thể tạo." });
      return;
    }
    const json = (await res.json()) as { item: Collection };
    setCollections((prev) => [...prev, json.item]);
    setNewName("");
    await addTo(json.item.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lưu vào danh sách</DialogTitle>
          <DialogDescription>
            Chọn một danh sách có sẵn hoặc tạo danh sách mới.
          </DialogDescription>
        </DialogHeader>
        {!session ? (
          <p className="text-sm text-muted-foreground">
            Đăng nhập để lưu video vào danh sách cá nhân.
          </p>
        ) : (
          <>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {collections.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bạn chưa có danh sách nào.</p>
              ) : (
                collections.map((c) => (
                  <Button
                    key={c.id}
                    type="button"
                    variant="secondary"
                    className="w-full justify-start"
                    disabled={pendingId === c.id}
                    onClick={() => void addTo(c.id)}
                  >
                    {pendingId === c.id ? "Đang lưu..." : c.name}
                  </Button>
                ))
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Tên danh sách mới"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={80}
              />
              <Button onClick={() => void createAndAdd()} disabled={loading || newName.trim().length < 1}>
                <Plus className="mr-1" /> Tạo
              </Button>
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
