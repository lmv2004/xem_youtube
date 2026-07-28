"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export function NewCollectionForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 1) return;
    setPending(true);
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      toast({ variant: "destructive", title: "Lỗi", description: data.message ?? "Không thể tạo." });
      return;
    }
    setName("");
    toast({ title: "Đã tạo", description: "Danh sách mới đã sẵn sàng." });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="new-name">Tên danh sách</Label>
        <Input
          id="new-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Nhạc chill, Học React..."
          maxLength={80}
        />
      </div>
      <Button type="submit" disabled={pending || name.trim().length < 1}>
        {pending ? "Đang tạo..." : "Tạo"}
      </Button>
    </form>
  );
}
