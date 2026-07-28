"use client";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/time";
import type { VideoItem } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookmarkPlus, ExternalLink } from "lucide-react";
import { VideoEmbed } from "@/components/video-embed";
import { AddToCollectionDialog } from "./add-to-collection-dialog";
import { useState } from "react";
import { formatDuration, formatViews } from "@/lib/format";

type HistoryItem = VideoItem & { watchedAt: string; topic: string };

export function HistoryList({ items }: { items: HistoryItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <HistoryRow key={`${it.id}-${it.watchedAt}`} item={it} />
      ))}
    </ul>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
          <div className="w-full sm:w-60">
            <VideoEmbed item={item} className="rounded-md" />
            {item.durationSeconds > 0 ? (
              <p className="mt-1 text-center text-xs text-muted-foreground">
                {formatDuration(item.durationSeconds)}
              </p>
            ) : null}
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="line-clamp-2 text-sm font-semibold">{item.title}</h3>
            <p className="text-xs text-muted-foreground">
              {item.channel} · {formatViews(item.viewCount)}
            </p>
            <p className="text-xs text-muted-foreground">
              Xem {formatDistanceToNow(item.watchedAt)}
              {item.topic ? ` · từ khoá: ${item.topic}` : ""}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild variant="link" size="sm" className="px-0">
                <Link href={item.watchUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1" /> Mở YouTube
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                <BookmarkPlus className="mr-1" /> Lưu
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <AddToCollectionDialog open={addOpen} onOpenChange={setAddOpen} item={item} />
    </li>
  );
}
