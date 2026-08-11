"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  Radio,
  Search,
  Unlock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { SyncPlayer, type SyncPlayerHandle } from "./sync-player";
import { RoomChat } from "./room-chat";
import { RoomMembers } from "./room-members";
import { RoomSearch } from "./room-search";
import { JoinGate } from "./join-gate";
import { useRoomSync } from "@/hooks/use-room-sync";
import { useRoomIdentity } from "@/hooks/use-room-identity";
import { useToast } from "@/hooks/use-toast";
import {
  DRIFT_TOLERANCE_SECONDS,
  canControlPlayback,
  describeAction,
  effectivePosition,
  type RoomDto,
  type RoomMessageDto,
} from "@/lib/rooms";
import type { VideoItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** How long to ignore local player events after we move the player ourselves. */
const ECHO_WINDOW_MS = 1200;
const VIDEO_SWAP_WINDOW_MS = 2500;

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const identity = useRoomIdentity(session?.user?.name ?? null);

  const [room, setRoom] = useState<RoomDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [lockPending, setLockPending] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"chat" | "search">("chat");

  const handleRef = useRef<SyncPlayerHandle | null>(null);
  const currentVideoRef = useRef<string | null>(null);
  // Programmatic play/pause/seek fires the same events a human would, so we
  // mute our own outgoing broadcasts for a moment. Without this every client
  // would echo every change back and the room would fight itself.
  const suppressUntilRef = useRef(0);

  const sync = useRoomSync(code, {
    enabled: joined && identity.hydrated,
    clientId: identity.clientId,
    displayName: identity.name,
  });
  const { appendLocal, leave, refresh } = sync;
  const currentUserId = session?.user?.id ?? null;

  // The host is identified by account, so they keep the role across devices.
  const isHost = Boolean(currentUserId && room && currentUserId === room.host.id);
  // The initial GET only seeds the first render; once polling starts it owns
  // the value, otherwise unlocking would never reach the UI.
  const hostOnlyControl = sync.serverTime
    ? sync.hostOnlyControl
    : room?.hostOnlyControl ?? false;
  const canControl = canControlPlayback({ hostOnlyControl, isHost });

  // Player callbacks may be bound once, so read the live value from a ref.
  const canControlRef = useRef(canControl);
  canControlRef.current = canControl;

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

  const pushPlayback = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!identity.clientId) return;
      // In a locked room, stay quiet instead of firing requests we know the
      // server will reject.
      if (!canControlRef.current) return;

      try {
        const res = await fetch("/api/rooms/" + code, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: identity.clientId, ...payload }),
        });
        if (res.status === 403) {
          const json = (await res.json().catch(() => null)) as
            | { message?: string }
            | null;
          toast({ title: json?.message ?? "Bạn không có quyền điều khiển phòng" });
        }
      } catch {
        /* the next poll will reconcile */
      }
    },
    [code, identity.clientId, toast],
  );

  // Follow the room. The only thing that decides whether we apply an update
  // is whether *we* were the one who made it.
  useEffect(() => {
    const handle = handleRef.current;
    const playback = sync.playback;
    const video = sync.video;
    if (!handle || !playback || !video) return;

    // A video swap wins over any seek: correcting the position of a player
    // that is about to load a different video is pointless.
    if (currentVideoRef.current && video.videoId !== currentVideoRef.current) {
      currentVideoRef.current = video.videoId;
      suppressUntilRef.current = Date.now() + VIDEO_SWAP_WINDOW_MS;
      handle.loadVideo(
        video.videoId,
        effectivePosition(playback, { serverTime: sync.serverTime ?? undefined }),
      );
      return;
    }
    if (!currentVideoRef.current) currentVideoRef.current = video.videoId;

    // Our own action coming back through polling — the player is already there.
    if (playback.lastActionById && playback.lastActionById === identity.clientId) {
      return;
    }

    const target = effectivePosition(playback, {
      serverTime: sync.serverTime ?? undefined,
    });

    if (Math.abs(handle.getCurrentTime() - target) > DRIFT_TOLERANCE_SECONDS) {
      suppressUntilRef.current = Date.now() + ECHO_WINDOW_MS;
      handle.seekTo(target);
    }
    if (playback.isPlaying && !handle.isPlaying()) {
      suppressUntilRef.current = Date.now() + ECHO_WINDOW_MS;
      handle.play();
    }
    if (!playback.isPlaying && handle.isPlaying()) {
      suppressUntilRef.current = Date.now() + ECHO_WINDOW_MS;
      handle.pause();
    }
  }, [sync.playback, sync.video, sync.serverTime, identity.clientId]);

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

  const changeVideo = useCallback(
    async (item: VideoItem) => {
      await pushPlayback({
        isPlaying: true,
        video: {
          videoId: item.id,
          title: item.title,
          channel: item.channel ?? "",
          thumbnail: item.thumbnail ?? "",
          embedUrl: item.embedUrl,
          watchUrl: item.watchUrl,
          duration: item.durationSeconds ?? 0,
        },
      });
      toast({ title: "Đã đổi video cho cả phòng", description: item.title });
      setTab("chat");
    },
    [pushPlayback, toast],
  );

  /** Host-only: take exclusive control of playback, or hand it back. */
  const toggleLock = async () => {
    if (!identity.clientId) return;
    const next = !hostOnlyControl;
    setLockPending(true);

    try {
      const res = await fetch("/api/rooms/" + code, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: identity.clientId, hostOnlyControl: next }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { message?: string } | null;
        toast({ title: json?.message ?? "Không đổi được cài đặt" });
        return;
      }

      setRoom((prev) => (prev ? { ...prev, hostOnlyControl: next } : prev));
      await refresh();
      toast({
        title: next
          ? "Đã khoá: chỉ chủ phòng điều khiển"
          : "Đã mở điều khiển cho mọi người",
      });
    } catch {
      toast({ title: "Không gọi được máy chủ" });
    } finally {
      setLockPending(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Không sao chép được liên kết" });
    }
  };

  const handleJoin = () => {
    setJoining(true);
    identity.persistName(identity.name);
    setJoined(true);
    setJoining(false);
  };

  const handleLeave = async () => {
    setLeaving(true);
    await leave();
    router.push("/rooms");
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

  if (!room || !identity.hydrated) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải phòng...
      </p>
    );
  }

  if (!joined) {
    return (
      <JoinGate
        code={room.code}
        title={room.title}
        video={room.video}
        name={identity.name}
        onNameChange={identity.rename}
        onJoin={handleJoin}
        joining={joining}
      />
    );
  }

  const video = sync.video ?? room.video;
  const playback = sync.playback ?? room.playback;
  const activity = describeAction(playback);

  return (
    <div className="space-y-5">
      <Glass intensity="strong" className="flex flex-wrap items-center gap-3 p-4">
        <Badge className="bg-primary/15 text-foreground ring-1 ring-primary/30">
          <Radio className="mr-1 h-3 w-3 text-primary" /> Mã {room.code}
        </Badge>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{room.title}</h1>
          <RoomMembers members={sync.members} myClientId={identity.clientId} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isHost ? (
            <Button
              type="button"
              size="sm"
              variant={hostOnlyControl ? "default" : "outline"}
              disabled={lockPending}
              onClick={() => void toggleLock()}
              title={
                hostOnlyControl
                  ? "Đang khoá — bấm để mở cho mọi người"
                  : "Mọi người đều điều khiển được — bấm để khoá"
              }
            >
              {lockPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : hostOnlyControl ? (
                <Lock className="mr-1 h-4 w-4" />
              ) : (
                <Unlock className="mr-1 h-4 w-4" />
              )}
              {hostOnlyControl ? "Chỉ chủ phòng" : "Mọi người"}
            </Button>
          ) : hostOnlyControl ? (
            <Badge className="bg-amber-500/15 text-foreground ring-1 ring-amber-500/30">
              <Lock className="mr-1 h-3 w-3" /> Chủ phòng đang khoá
            </Badge>
          ) : null}

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
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={leaving}
            onClick={() => void handleLeave()}
          >
            {leaving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-1 h-4 w-4" />
            )}
            Rời phòng
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
            videoId={room.video.videoId}
            onReady={(handle) => {
              handleRef.current = handle;
            }}
            onStateChange={(playing, currentTime) => {
              // Ignore the events caused by our own sync corrections.
              if (Date.now() < suppressUntilRef.current) return;
              void pushPlayback({ isPlaying: playing, positionSeconds: currentTime });
            }}
          />

          <div>
            <h2 className="text-sm font-semibold leading-snug">{video.title}</h2>
            <p className="text-xs text-muted-foreground">{video.channel}</p>
          </div>

          {canControl ? (
            <p className="text-xs text-muted-foreground">
              {activity
                ? activity
                : hostOnlyControl
                  ? "Bạn đang khoá phòng: chỉ bạn điều khiển được."
                  : "Ai trong phòng cũng phát, tạm dừng, tua và đổi video được."}
            </p>
          ) : (
            <p className="flex items-start gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Chủ phòng đang khoá điều khiển. Trình phát của bạn sẽ tự bám theo chủ
                phòng.
                {activity ? " " + activity + "." : ""}
              </span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex gap-1 rounded-xl bg-foreground/5 p-1">
            <button
              type="button"
              onClick={() => setTab("chat")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                tab === "chat"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageSquare className="h-4 w-4" /> Trò chuyện
            </button>
            <button
              type="button"
              onClick={() => setTab("search")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                tab === "search"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {canControl ? (
                <Search className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Đổi video
            </button>
          </div>

          {tab === "chat" ? (
            <RoomChat
              messages={sync.messages}
              canChat={Boolean(currentUserId)}
              currentUserId={currentUserId}
              isSending={isSending}
              onSend={onSend}
            />
          ) : (
            <RoomSearch
              onPick={changeVideo}
              activeVideoId={video.videoId}
              disabled={!canControl}
            />
          )}
        </div>
      </div>
    </div>
  );
}
