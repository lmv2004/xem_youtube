"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "@/components/locale-provider";
import { useToast } from "@/hooks/use-toast";
import {
  MAX_PERSONAL_PLAYLIST_ITEMS,
  normalizePersonalPlaylist,
  personalPlaylistHref,
} from "@/lib/personal-playlist";
import { savePersonalPlaylist } from "@/lib/personal-playlist-storage";
import type { VideoItem } from "@/lib/types";

export function useStartPlaylist(ownerId?: string) {
  const router = useRouter();
  const t = useTranslations();
  const { toast } = useToast();
  return (items: VideoItem[], title: string, selectedId = items[0]?.id) => {
    const selectedIndex = items.findIndex((item) => item.id === selectedId);
    const offset = selectedIndex >= MAX_PERSONAL_PLAYLIST_ITEMS ? selectedIndex : 0;
    const snapshot = items.slice(offset, offset + MAX_PERSONAL_PLAYLIST_ITEMS);
    const playlist = normalizePersonalPlaylist({
      id: crypto.randomUUID(),
      title,
      items: snapshot,
      ownerId,
    });
    if (!playlist || !playlist.order.includes(selectedId)) return;
    if (!savePersonalPlaylist(playlist))
      toast({
        title: t("Danh sách chỉ được giữ trong phiên hiện tại"),
        description: t("Trình duyệt đang chặn lưu trữ. Tải lại trang có thể mất danh sách phát."),
      });
    if (items.length > MAX_PERSONAL_PLAYLIST_ITEMS)
      toast({
        title: t("Mỗi phiên phát tối đa {count} video", { count: MAX_PERSONAL_PLAYLIST_ITEMS }),
        description: t("Đang dùng video {first}–{last} trong danh sách.", {
          first: offset + 1,
          last: offset + snapshot.length,
        }),
      });
    // Let the first selected video retain its saved watch progress.
    router.push(personalPlaylistHref(playlist, selectedId, false));
  };
}
