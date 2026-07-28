"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatViews } from "@/lib/format";
import { VideoEmbed } from "@/components/video-embed";
import {
  Dialog,
  DialogContent,
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

export function CollectionManager({ collectionId, collectionName, items }: Props) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(collectionName);
  const [renamePending, setRenamePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (newName.trim().length < 1) return;
    setRenamePending(true);
    const res = await fetch(`/api/collections/${collectionId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setRenamePending(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể đổi tên." });
      return;
    }
    toast({ title: "Đã cập nhật" });
    setRenameOpen(false);
    router.refresh();
  }

  async function deleteCollection() {
    setDeletePending(true);
    const res = await fetch(`/api/collections/${collectionId}`, { method: "DELETE" });
    setDeletePending(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể xoá." });
      return;
    }
    toast({ title: "Đã xoá" });
    router.push("/favorites");
    router.refresh();
  }

  async function removeItem(videoId: string) {
    setRemoveId(videoId);
    const res = await fetch(`/api/collections/${collectionId}/items/${videoId}`, {
      method: "DELETE",
    });
    setRemoveId(null);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể xoá video." });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setRenameOpen(true)}>
          Đổi tên
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive"
          onClick={deleteCollection}
          disabled={deletePending}
        >
          <Trash2 className="mr-1" /> Xoá danh sách
        </Button>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id}>
            <Card>
              <CardContent className="space-y-2 p-0">
                <div className="relative">
                  <VideoEmbed item={item} className="rounded-t-lg" />
                  {item.durationSeconds > 0 ? (
                    <Badge
                      variant="secondary"
                      className="absolute bottom-2 right-2 bg-black/70 text-white"
                    >
                      {formatDuration(item.durationSeconds)}
                    </Badge>
                  ) : null}
                </div>
                <div className="space-y-1 p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold">{item.title}</h3>
                  <p className="truncate text-xs text-muted-foreground">{item.channel}</p>
                  <p className="text-xs text-muted-foreground">{formatViews(item.viewCount)}</p>
                  <div className="pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => void removeItem(item.id)}
                      disabled={removeId === item.id}
                    >
                      <Trash2 className="mr-1" />
                      {removeId === item.id ? "Đang xoá..." : "Bỏ khỏi danh sách"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên danh sách</DialogTitle>
          </DialogHeader>
          <form onSubmit={rename} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rename">Tên mới</Label>
              <Input
                id="rename"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={80}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={renamePending || newName.trim().length < 1}>
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
