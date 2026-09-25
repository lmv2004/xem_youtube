"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  ExternalLink,
  History,
  Play,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { formatDuration, formatViews } from "@/lib/format";
import { formatDistanceToNow } from "@/lib/time";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type HistoryItem = VideoItem & {
  historyId: string;
  watchedAt: string;
  topic?: string;
};

// Group items into timeline buckets: Hôm nay, Hôm qua, Tuần này, Cũ hơn
function groupTimeline(items: HistoryItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: { label: string; items: HistoryItem[] }[] = [
    { label: "Hôm nay", items: [] },
    { label: "Hôm qua", items: [] },
    { label: "Tuần này", items: [] },
    { label: "Cũ hơn", items: [] },
  ];

  for (const item of items) {
    const itemDate = new Date(item.watchedAt);
    if (itemDate >= today) {
      groups[0].items.push(item);
    } else if (itemDate >= yesterday) {
      groups[1].items.push(item);
    } else if (itemDate >= lastWeek) {
      groups[2].items.push(item);
    } else {
      groups[3].items.push(item);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export function HistoryList({ initialItems }: { initialItems: HistoryItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<HistoryItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Filter items by search query
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (it) => it.title.toLowerCase().includes(q) || it.channel.toLowerCase().includes(q),
    );
  }, [items, search]);

  const timelineGroups = useMemo(() => groupTimeline(filtered), [filtered]);

  const deleteItem = async (historyId: string) => {
    setItems((prev) => prev.filter((it) => it.historyId !== historyId));
    try {
      const res = await fetch(`/api/history?id=${historyId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Đã xóa video khỏi lịch sử" });
      }
    } catch {
      /* ignore */
    }
  };

  const clearAllHistory = async () => {
    setIsClearing(true);
    try {
      const res = await fetch("/api/history?all=true", { method: "DELETE" });
      if (res.ok) {
        setItems([]);
        setClearDialogOpen(false);
        toast({ title: "Đã xóa toàn bộ lịch sử xem" });
      }
    } catch {
      toast({ title: "Không thể xóa lịch sử", variant: "destructive" });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-7 animate-in-up">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Lịch sử xem video
            </h1>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-bold text-cyan-400">
              {items.length} video
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Xem lại các nội dung bạn đã từng thưởng thức, được phân loại theo mốc thời gian.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearDialogOpen(true)}
              className="rounded-xl border-white/10 text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              <span>Xóa toàn bộ</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search Input Filter */}
      {items.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm trong lịch sử xem..."
            className="h-10 rounded-xl border-white/10 bg-white/5 pl-9 text-xs sm:text-sm focus:border-cyan-500/50"
          />
        </div>
      )}

      {/* Main Content: Grouped by Timeline */}
      {items.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-white/10 bg-card/50 backdrop-blur-2xl space-y-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-400">
            <History className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <p className="font-display text-lg font-bold text-foreground">Lịch sử xem đang trống</p>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
              Khi bạn phát các video trên XemPhim khi đã đăng nhập, chúng sẽ tự động được ghi nhớ tại đây.
            </p>
          </div>
          <Button asChild size="sm" className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Link href="/">Khám phá video ngay</Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center rounded-3xl border border-white/10 bg-card/40 backdrop-blur-2xl">
          <p className="font-semibold text-foreground">Không tìm thấy video phù hợp</p>
          <p className="text-xs text-muted-foreground mt-1">Hãy thử tìm với từ khóa khác.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {timelineGroups.map((group) => (
            <section key={group.label} className="space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                <span>{group.label}</span>
                <span className="text-[11px] font-normal text-muted-foreground/60">
                  ({group.items.length})
                </span>
              </div>

              <div className="space-y-2.5">
                {group.items.map((item) => (
                  <div
                    key={item.historyId}
                    className="group relative flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-white/5 bg-card/60 p-3 transition-all duration-300 hover:border-cyan-500/40 hover:bg-card/90 hover:shadow-lg"
                  >
                    {/* Thumbnail */}
                    <div
                      onClick={() => router.push(`/watch/${item.id}`)}
                      className="relative aspect-video w-full sm:w-44 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-black/80 shadow"
                    >
                      {item.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : null}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
                        <Play className="h-5 w-5 fill-white text-white" />
                      </span>
                      {item.durationSeconds > 0 ? (
                        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {formatDuration(item.durationSeconds)}
                        </span>
                      ) : null}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3
                        onClick={() => router.push(`/watch/${item.id}`)}
                        className="cursor-pointer font-display line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-cyan-400"
                        title={item.title}
                      >
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium">{item.channel}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/75">
                        <span>Đã xem {formatDistanceToNow(item.watchedAt)}</span>
                        {item.viewCount > 0 ? <span>• {formatViews(item.viewCount)}</span> : null}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => router.push(`/watch/${item.id}`)}
                        className="h-8 gap-1.5 rounded-xl border border-white/10 text-xs hover:border-cyan-500/40 hover:text-cyan-400"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Xem lại</span>
                      </Button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item.historyId)}
                        title="Xóa khỏi lịch sử"
                        className="grid h-8 w-8 place-items-center rounded-xl text-muted-foreground hover:bg-white/10 hover:text-destructive transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-card/95 shadow-2xl backdrop-blur-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Xác nhận xóa toàn bộ lịch sử?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Thao tác này sẽ xóa tất cả các video đã lưu trong lịch sử xem của bạn. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setClearDialogOpen(false)}
              className="rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isClearing}
              onClick={clearAllHistory}
              className="rounded-xl"
            >
              {isClearing ? "Đang xóa..." : "Xóa vĩnh viễn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
