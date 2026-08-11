"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { VideoItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

/** Creates a watch party from a video and navigates the host into it. */
export function useCreateRoom() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = useCallback(
    async (item: VideoItem) => {
      setIsCreating(true);
      try {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            video: {
              videoId: item.id,
              title: item.title,
              channel: item.channel ?? "",
              thumbnail: item.thumbnail ?? "",
              embedUrl: item.embedUrl,
              watchUrl: item.watchUrl,
              duration: item.durationSeconds ?? 0,
            },
          }),
        });

        const json = (await res.json().catch(() => null)) as
          | { code?: string; message?: string }
          | null;

        if (!res.ok || !json?.code) {
          toast({
            title: "Không tạo được phòng",
            description: json?.message ?? "Thử lại sau nhé.",
          });
          return null;
        }

        router.push("/rooms/" + json.code);
        return json.code;
      } catch {
        toast({ title: "Không gọi được máy chủ" });
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [router, toast],
  );

  return { createRoom, isCreating };
}
