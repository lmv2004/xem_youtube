"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, Copy, ExternalLink, Loader2, Radio, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { SyncPlayer, type SyncPlayerHandle } from "./sync-player";
import { RoomChat } from "./room-chat";
import { useRoomSync } from "@/hooks/use-room-sync";
import { useToast } from "@/hooks/use-toast";
import {
  DRIFT_TOLERANCE_SECONDS,
  effectivePosition,
  type RoomDto,
  type RoomMessageDto,
} from "@/lib/rooms";

export function RoomClient({ code }: { code: string }) {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [room, setRoom] = useState<RoomDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRef = useRef<SyncPlayerHandle | null>(null);
  const currentUserId = session?.user?.id ?? null;
  const isHost = Boolean(room && currentUserId && room.host.id === currentUserId);

  const sync = useRoomSync(code, Boolean(room));
  const { appendLocal } = sync;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/rooms/" + code, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as
          | { room?: RoomDto; message?: string }
          | null;
        if (cancelled) return;
        if (!res.ok || !json?.room) {
          setLoadError(json?.message ?? "Không tải được phòng.");
          return;
        }
        setRoom(json.room);
      } catch {
        if (!cancelled) setLoadError("Không gọi được máy chủ.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  /** Host broadcasts its own play/pause; viewers never write playback state. */
  const pushPlayback = useCallback(
    async (isPlaying: boolean, positionSeconds: number) => {
      try {
        await fetch("/api/rooms/" + code, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPlaying, positionSeconds }),
        });
      } catch {
        /* the next poll will reconcile */
      }
    },
    [code],
  );

  // Viewers follow the host. We only hard-seek past the drift tolerance,
  // because correcting every fraction of a second is more disruptive than
  // simply being slightly behind.
  useEffect(() => {
    const handle = handleRef.current;
    const playback = sync.playback;
    if (!handle || !playback || isHost) return;

    const target = effectivePosition(playback, {
      serverTime: sync.serverTime ?? undefined,
    });

    if (Math.abs(handle.getCurrentTime() - target) > DRIFT_TOLERANCE_SECONDS) {
      handle.seekTo(target);
    }
    if (playback.isPlaying && !handle.isPlaying()) handle.play();
    if (!playback.isPlaying && handle.isPlaying()) handle.pause();
  }, [sync.playback, sync.serverTime, isHost]);

  const onSend = useCallback(
    async (body: string) => {
      setIsSending(true);
      try {
        const res = await fetch("/api/rooms/" + code + "/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
        const json = (await res.json().catch(() => null)) as
          | { message?: RoomMessageDto | string }
          | null;

        if (!res.ok) {
          const text =
            typeof json?.message === "string" ? json.message : "Không gửi được tin nhắn.";
          toast({ title: text });
          return false;
        }

        // Show it right away instead of waiting up to 2s for the next poll.
        if (json?.message && typeof json.message !== "string") {
          appendLocal(json.message);
        }
        return true;
      } catch {
        toast({ title: "Không gọi được máy chủ" });
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [code, appendLocal, toast],
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Không sao chép được liên kết" });
    }
  };

  if (loadError) {
    return (
      <Glass intensity="soft" className="p-6 text-center">
        <p className="font-medium">{loadError}</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/rooms">Về danh sách phòng</Link>
        </Button>
      </Glass>
    );
  }

  if (!room) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang vào phòng...
      </p>
    );
  }

  const video = sync.video ?? room.video;

  return (
    <div className="space-y-5">
      <Glass intensity="strong" className="flex flex-wrap items-center gap-3 p-4">
        <Badge className="bg-primary/15 text-foreground ring-1 ring-primary/30">
          <Radio className="mr-1 h-3 w-3 text-primary" /> Mã {room.code}
        </Badge>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{room.title}</h1>
          <p className="truncate text-xs text-muted-foreground">
            Chủ phòng: {room.host.name ?? "Ẩn danh"}
            {isHost ? " (bạn)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            {copied ? (
              <>
                <Check className="mr-1 h-4 w-4" /> Đã chép
              </>
            ) : (
              <>
                <Copy className="mr-1 h-4 w-4" /> Chia sẻ link
              </>
            )}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={video.watchUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" /> YouTube
            </Link>
          </Button>
        </div>
      </Glass>

      {sync.isOffline ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">
          Mất kết nối tới phòng. Đang thử lại...
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <SyncPlayer
            videoId={video.videoId}
            onReady={(handle) => {
              handleRef.current = handle;
            }}
            onStateChange={(playing, currentTime) => {
              if (isHost) void pushPlayback(playing, currentTime);
            }}
          />
          <div>
            <h2 className="text-sm font-semibold leading-snug">{video.title}</h2>
            <p className="text-xs text-muted-foreground">{video.channel}</p>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {isHost
              ? "Bạn đang điều khiển. Mọi người trong phòng sẽ theo thao tác phát/tạm dừng của bạn."
              : "Phòng đang theo chủ phòng. Bạn tự tua thì sẽ bị kéo về đúng điểm chung."}
          </p>
        </div>

        <RoomChat
          messages={sync.messages}
          canChat={Boolean(currentUserId)}
          currentUserId={currentUserId}
          isSending={isSending}
          onSend={onSend}
        />
      </div>
    </div>
  );
}
