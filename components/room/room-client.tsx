"use client";
import { useTranslations } from "@/components/locale-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Check,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  LogOut,
  Radio,
  Search,
  ListPlus,
  Unlock,
  Share2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SyncPlayer, type SyncPlayerHandle } from "./sync-player";
import { RoomChat } from "./room-chat";
import { RoomMembers } from "./room-members";
import { RoomSearch } from "./room-search";
import { RoomRelatedVideos } from "./room-related-videos";
import { RoomQueue } from "./room-queue";
import { RoomStage } from "./room-stage";
import { useRoomStage } from "@/hooks/use-room-stage";
import { RenameRoomButton } from "./rename-room-button";
import { DeleteRoomButton } from "./delete-room-button";
import { JoinGate } from "./join-gate";
import { useRoomSync } from "@/hooks/use-room-sync";
import { useRoomIdentity } from "@/hooks/use-room-identity";
import { useToast } from "@/hooks/use-toast";
import {
  DRIFT_TOLERANCE_SECONDS,
  canControlPlayback,
  canAddToQueue,
  describeAction,
  effectivePosition,
  type RoomDto,
  type RoomMessageDto,
  type RoomPlaybackUpdate,
} from "@/lib/rooms";
import type { RoomCommand } from "@/lib/room-protocol";
import type { VideoItem } from "@/lib/types";

/** How long to ignore local player events after we move the player ourselves. */
const ECHO_WINDOW_MS = 1200;
const VIDEO_SWAP_WINDOW_MS = 2500;
const getRoomJoinedKey = (roomCode: string) => `xemphim:room:joined:${roomCode}`;

export function RoomClient({ code }: { code: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { toast } = useToast();
  const identity = useRoomIdentity();

  const [room, setRoom] = useState<RoomDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!code) return;
    try {
      if (window.localStorage.getItem(getRoomJoinedKey(code)) === "true") {
        setJoined(true);
      }
    } catch {
      /* Storage is optional (private mode). */
    }
  }, [code]);
  const [lockPending, setLockPending] = useState(false);
  const [queuePermissionPending, setQueuePermissionPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  useEffect(() => {
    if (!unreadMessages) return;
    const originalTitle = document.title;
    document.title = `(${unreadMessages}) ${originalTitle}`;
    return () => { document.title = originalTitle; };
  }, [unreadMessages]);
  useEffect(() => {
    if (!focused) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocused(false);
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", escape);
    };
  }, [focused]);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"chat" | "search" | "queue">("chat");
  const [queuePending, setQueuePending] = useState(false);
  const currentGenerationRef = useRef<number | null>(null);
  const endedRef = useRef<{
    generation: number;
    duration: number;
    anchor: string;
    lastSent: number;
  } | null>(null);
  const endingPendingRef = useRef(false);

  const [playerReady, setPlayerReady] = useState(false);
  const actionQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const actionPendingRef = useRef(false);
  const localActionAtRef = useRef(0);
  const handleRef = useRef<SyncPlayerHandle | null>(null);
  const currentVideoRef = useRef<string | null>(null);
  // Programmatic play/pause/seek fires the same events a human would, so we
  // mute our own outgoing broadcasts for a moment. Without this every client
  // would echo every change back and the room would fight itself.
  const suppressUntilRef = useRef(0);

  const currentUserId = session?.user?.id ?? null;
  const sync = useRoomSync(code, {
    // Resolve the account first so login hydration cannot immediately replace
    // an initial guest connection with a second authenticated connection.
    enabled: joined && identity.hydrated && sessionStatus !== "loading",
    clientId: identity.clientId,
    displayName: identity.name,
    userId: currentUserId,
  });
  const {
    appendLocal,
    leave,
    applyPlayback,
    editQueue,
    request: sendCommand,
  } = sync;

  // The host is identified by account, so they keep the role across devices.
  const isHost = Boolean(
    currentUserId && room && currentUserId === room.host.id,
  );
  // The initial GET only seeds the first render; once polling starts it owns
  // the value, otherwise unlocking would never reach the UI.
  const hostOnlyControl = sync.serverTime
    ? sync.hostOnlyControl
    : (room?.hostOnlyControl ?? false);
  const canControl = canControlPlayback({ hostOnlyControl, isHost });
  const allowQueueAdds = sync.serverTime
    ? sync.allowQueueAdds
    : (room?.allowQueueAdds ?? false);
  const canEnqueue = canAddToQueue({ hostOnlyControl, allowQueueAdds, isHost });

  const stageHook = useRoomStage({
    code,
    clientId: identity.clientId,
    isHost,
    displayName: identity.name,
    avatarUrl: session?.user?.image,
    disabled: !joined || !identity.hydrated || sync.isOffline,
  });

  // Player callbacks may be bound once, so read the live value from a ref.
  const canControlRef = useRef(canControl);
  canControlRef.current = canControl && !sync.isOffline;

  useEffect(() => {
    if (isHost && code) {
      setJoined(true);
      try {
        window.localStorage.setItem(getRoomJoinedKey(code), "true");
      } catch {
        /* Storage is optional (private mode). */
      }
    }
  }, [isHost, code]);

  useEffect(() => {
    if (sync.isClosed && code) {
      try {
        window.localStorage.removeItem(getRoomJoinedKey(code));
      } catch {
        /* Storage is optional (private mode). */
      }
    }
  }, [sync.isClosed, code]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/rooms/" + code, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as {
          room?: RoomDto;
          message?: string;
        } | null;
        if (cancelled) return;
        if (!res.ok || !json?.room) {
          setLoadError(json?.message ?? t("Không tải được phòng."));
          return;
        }
        setRoom(json.room);
      } catch {
        if (!cancelled) setLoadError(t("Không gọi được máy chủ."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, t]);

  const changeQueue = useCallback(
    async (payload: Extract<RoomCommand, { type: "queue" }>["payload"]) => {
      if (
        payload.action === "add" ||
        payload.action === "move" ||
        payload.action === "remove"
      ) {
        if (
          !(payload.action === "add" ? canEnqueue : canControl) ||
          sync.isOffline ||
          (payload.action === "add" && sync.queue.length >= 50) ||
          sync.queueEdits.length >= 20
        )
          return false;
        void editQueue(payload).catch((error) =>
          toast({
            title: t(
              error instanceof Error
                ? error.message
                : "Không cập nhật được hàng đợi",
            ),
          }),
        );
        return true;
      }
      if (sync.isOffline || (payload.action !== "ended" && !canControl))
        return false;
      setQueuePending(true);
      try {
        applyPlayback(
          (await sendCommand({ type: "queue", payload })) as RoomPlaybackUpdate,
        );
        return true;
      } catch (error) {
        toast({
          title:
            error instanceof Error
              ? t(error.message)
              : t("Không cập nhật được hàng đợi"),
        });
        return false;
      } finally {
        setQueuePending(false);
      }
    },
    [
      sendCommand,
      applyPlayback,
      editQueue,
      canControl,
      canEnqueue,
      sync.isOffline,
      sync.queue.length,
      sync.queueEdits.length,
      toast,
      t,
    ],
  );

  const reportEnded = useCallback(async () => {
    const ended = endedRef.current;
    if (
      !ended ||
      endingPendingRef.current ||
      sync.isOffline ||
      Date.now() - ended.lastSent < 3000
    )
      return;
    ended.lastSent = Date.now();
    endingPendingRef.current = true;
    try {
      applyPlayback(
        (await sendCommand({
          type: "queue",
          payload: {
            action: "ended",
            generation: ended.generation,
            duration: ended.duration,
          },
        })) as RoomPlaybackUpdate,
      );
    } catch {
      /* Keep the end report for the next successful sync; never discard a queued video locally. */
    } finally {
      endingPendingRef.current = false;
    }
  }, [sync.isOffline, sendCommand, applyPlayback]);

  useEffect(() => {
    const ended = endedRef.current;
    if (!ended) return;
    if (
      ended.generation !== sync.playbackGeneration ||
      ended.anchor !== sync.playback?.lastSyncAt
    )
      endedRef.current = null;
    else void reportEnded();
  }, [
    sync.clockTick,
    sync.playbackGeneration,
    sync.playback?.lastSyncAt,
    reportEnded,
  ]);

  const pushPlayback = useCallback(
    async (payload: Extract<RoomCommand, { type: "playback" }>["payload"], fromPlayer = false) => {
      if (!identity.clientId) return false;
      // In a locked room, stay quiet instead of firing requests we know the
      // server will reject.
      if (!canControlRef.current) return false;
      const send = async () => {
        if (!canControlRef.current || (fromPlayer && document.hidden)) return false;
        actionPendingRef.current = true;
        localActionAtRef.current = Date.now();

        try {
          const update = (await sendCommand({
            type: "playback",
            payload,
          })) as RoomPlaybackUpdate;
          applyPlayback(update);
          return true;
        } catch (error) {
          toast({
            title:
              error instanceof Error
                ? t(error.message)
                : t("Chưa cập nhật được phòng"),
          });
          return false;
        } finally {
          actionPendingRef.current = false;
        }
      };
      const result = actionQueueRef.current.then(send, send);
      actionQueueRef.current = result;
      return result;
    },
    [identity.clientId, toast, sendCommand, applyPlayback, t],
  );

  // Reconcile all players, including our own after the short echo window.
  useEffect(() => {
    const handle = handleRef.current;
    const playback = sync.playback;
    const video = sync.video;
    if (
      !handle ||
      !playback ||
      !video ||
      !playerReady ||
      actionPendingRef.current ||
      sync.isOffline
    )
      return;
    if (endedRef.current) return;

    // A video swap wins over any seek: correcting the position of a player
    // that is about to load a different video is pointless.
    // Video swaps MUST proceed even when the tab is hidden so that the next
    // queued video loads in background tabs; otherwise the player stalls.
    if (
      currentVideoRef.current &&
      (video.videoId !== currentVideoRef.current ||
        (currentGenerationRef.current !== null &&
          currentGenerationRef.current !== sync.playbackGeneration &&
          playback.isPlaying))
    ) {
      currentVideoRef.current = video.videoId;
      currentGenerationRef.current = sync.playbackGeneration;
      suppressUntilRef.current = Date.now() + VIDEO_SWAP_WINDOW_MS;
      handle.loadVideo(
        video.videoId,
        effectivePosition(playback, {
          serverTime: sync.serverTime || undefined,
          receivedAt: sync.receivedAt,
        }),
      );
      return;
    }
    if (!currentVideoRef.current) currentVideoRef.current = video.videoId;
    currentGenerationRef.current = sync.playbackGeneration;

    // Seek / play / pause corrections are pointless while the tab is hidden:
    // the browser throttles media anyway, and echoing state changes back would
    // fight other clients. Only video swaps (above) proceed in background tabs.
    if (document.hidden) return;

    if (Date.now() < suppressUntilRef.current) return;
    // Let a buffering player finish its current load. Repeated seeks on the
    // one-second clock can keep restarting that load on a slow connection.
    // A local play starts buffering before YouTube emits PLAYING and we can
    // publish the intent. Applying the old paused snapshot here cancels it.
    if (handle.isBuffering()) return;

    // Our own action coming back through polling — the player is already there.
    if (
      playback.lastActionById === identity.clientId &&
      Date.now() - localActionAtRef.current < ECHO_WINDOW_MS
    ) {
      return;
    }

    const target = effectivePosition(playback, {
      serverTime: sync.serverTime || undefined,
      receivedAt: sync.receivedAt,
    });

    if (Math.abs(handle.getCurrentTime() - target) > DRIFT_TOLERANCE_SECONDS) {
      suppressUntilRef.current = Date.now() + ECHO_WINDOW_MS;
      handle.seekTo(target);
    }
    if (playback.isPlaying && !handle.isPlaying() && !handle.isBuffering()) {
      suppressUntilRef.current = Date.now() + ECHO_WINDOW_MS;
      handle.play();
    }
    if (!playback.isPlaying && handle.isPlaying()) {
      suppressUntilRef.current = Date.now() + ECHO_WINDOW_MS;
      handle.pause();
    }
  }, [
    sync.playback,
    sync.video,
    sync.serverTime,
    sync.receivedAt,
    sync.clockTick,
    sync.playbackGeneration,
    sync.isOffline,
    identity.clientId,
    playerReady,
  ]);

  const onSend = useCallback(
    async (body: string, messageId: string) => {
      try {
        const message = (await sendCommand(
          {
            type: "chat",
            body,
            messageId,
          },
          messageId,
        )) as RoomMessageDto;
        appendLocal(message);
        return true;
      } catch (error) {
        toast({
          title:
            error instanceof Error
              ? t(error.message)
              : t("Chưa gửi được tin nhắn"),
        });
        return false;
      }
    },
    [sendCommand, appendLocal, toast, t],
  );

  const changeVideo = useCallback(
    async (item: VideoItem) => {
      const changed = await pushPlayback({
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
      if (!changed) return;
      toast({ title: t("Đã đổi video cho cả phòng"), description: item.title });
      setTab("chat");
    },
    [pushPlayback, toast, t],
  );

  /** Host-only: take exclusive control of playback, or hand it back. */
  const toggleLock = async () => {
    if (!identity.clientId) return;
    const next = !hostOnlyControl;
    setLockPending(true);

    try {
      const update = (await sendCommand({
        type: "playback",
        payload: { hostOnlyControl: next },
      })) as RoomPlaybackUpdate;
      applyPlayback(update);
      toast({
        title: next
          ? t("Đã khoá: chỉ chủ phòng điều khiển")
          : t("Đã mở điều khiển cho mọi người"),
      });
    } catch {
      toast({ title: t("Không gọi được máy chủ") });
    } finally {
      setLockPending(false);
    }
  };

  const toggleQueueContributions = async () => {
    if (!isHost || lockPending || queuePermissionPending || sync.isOffline) return;
    setQueuePermissionPending(true);
    try {
      const update = (await sendCommand({
        type: "playback",
        payload: { allowQueueAdds: !allowQueueAdds },
      })) as RoomPlaybackUpdate;
      applyPlayback(update);
      toast({
        title: update.allowQueueAdds
          ? t("Đã cho phép mọi người thêm video")
          : t("Đã tắt quyền thêm video của thành viên"),
      });
    } catch (error) {
      toast({
        title: error instanceof Error ? t(error.message) : t("Không gọi được máy chủ"),
      });
    } finally {
      setQueuePermissionPending(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t("Không sao chép được liên kết") });
    }
  };

  const copyCode = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      toast({ title: t("Đã sao chép mã phòng"), description: room.code });
    } catch {
      toast({ title: t("Không sao chép được liên kết") });
    }
  };

  const handleJoin = () => {
    setJoining(true);
    identity.persistName(identity.name);
    try {
      window.localStorage.setItem(getRoomJoinedKey(code), "true");
    } catch {
      /* Storage is optional (private mode). */
    }
    setJoined(true);
    setJoining(false);
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      window.localStorage.removeItem(getRoomJoinedKey(code));
    } catch {
      /* Storage is optional (private mode). */
    }
    await leave();
    router.push("/rooms");
  };

  if (loadError || sync.isClosed) {
    return (
      <Glass intensity="soft" className="p-6 text-center">
        <p className="font-medium">
          {sync.isClosed
            ? t("Phòng đã đóng hoặc bị xóa bởi chủ phòng.")
            : t(loadError ?? "")}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/rooms">{t("Về danh sách phòng")}</Link>
        </Button>
      </Glass>
    );
  }

  if (!room || !identity.hydrated) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />{" "}
        {t("Đang tải phòng...")}{" "}
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
        hostOnlyControl={room.hostOnlyControl}
        allowQueueAdds={room.allowQueueAdds}
      />
    );
  }

  async function enqueueVideo(item: VideoItem) {
    const added = await changeQueue({
      action: "add",
      video: {
        videoId: item.id, title: item.title, channel: item.channel ?? "",
        thumbnail: item.thumbnail ?? "", embedUrl: item.embedUrl,
        watchUrl: item.watchUrl, duration: item.durationSeconds ?? 0,
      },
    });
    if (added) toast({ title: t("Đã thêm vào hàng đợi"), description: item.title });
    return added;
  }

  const roomTitle = sync.roomTitle ?? room.title;
  const video = sync.video ?? room.video;
  const playback = sync.playback ?? room.playback;
  const activity = describeAction(playback, t);

  return (
    <div className={focused ? "fixed inset-0 z-50 overflow-y-auto bg-background p-3 sm:p-5 lg:flex lg:flex-col lg:gap-3" : "space-y-5"}>
      {/* Room Navigation & Top Control Bar */}
      {!focused && (
        <div className="rounded-2xl border border-border/80 bg-card/85 backdrop-blur-xl p-3 sm:p-4 shadow-sm transition-all flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Left: Live status, Room Code, Title, Host & Members */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 text-[11px] font-bold text-rose-500 shrink-0 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>LIVE</span>
            </div>

            <button
              type="button"
              className="group flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 hover:bg-muted px-3 py-1 font-mono text-xs font-bold tracking-wider hover:border-rose-500/40 transition-all active:scale-95 shadow-2xs shrink-0"
              onClick={() => void copyCode()}
              title={t("Sao chép mã phòng")}
              aria-label={t("Sao chép mã phòng {p0}", { p0: room.code })}
            >
              <Radio className="h-3.5 w-3.5 text-rose-500 group-hover:animate-pulse" />
              <span>{room.code}</span>
              <Copy className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
            </button>

            <div className="min-w-0 flex items-center gap-2">
              <h1
                className="line-clamp-1 text-sm sm:text-base font-bold text-foreground"
                title={roomTitle}
              >
                {roomTitle}
              </h1>
              {isHost && (
                <RenameRoomButton
                  title={roomTitle}
                  disabled={sync.isOffline}
                  onSave={async (title) => {
                    applyPlayback(
                      (await sendCommand({
                        type: "rename",
                        title,
                      })) as RoomPlaybackUpdate,
                    );
                  }}
                />
              )}
            </div>

            <div className="flex items-center gap-2 border-l border-border/60 pl-3">
              <RoomMembers
                members={sync.members}
                myClientId={identity.clientId}
              />
              <span className="hidden sm:inline text-xs text-muted-foreground">
                {isHost
                  ? t("Bạn là chủ phòng")
                  : t("Chủ: {p0}", {
                      p0: room.host.name ?? t("Người dùng"),
                    })}
              </span>
            </div>
          </div>

          {/* Right: Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end">
            {/* Host lock control */}
            {isHost && (
              <Button
                type="button"
                size="sm"
                variant={hostOnlyControl ? "default" : "outline"}
                disabled={lockPending || queuePermissionPending || sync.isOffline}
                onClick={() => void toggleLock()}
                className={cn(
                  "rounded-full gap-1.5 h-8 text-xs font-semibold shadow-2xs transition-all",
                  hostOnlyControl && "bg-rose-600 hover:bg-rose-500 text-white"
                )}
                title={
                  hostOnlyControl
                    ? t("Đang khoá — bấm để mở cho mọi người")
                    : t("Mọi người đều điều khiển được — bấm để khoá")
                }
              >
                {lockPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : hostOnlyControl ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5" />
                )}
                <span>{hostOnlyControl ? t("Chỉ chủ phòng") : t("Mở điều khiển")}</span>
              </Button>
            )}

            {/* Host allow queue adds */}
            {hostOnlyControl && isHost && (
              <Button
                type="button"
                size="sm"
                variant={allowQueueAdds ? "secondary" : "outline"}
                aria-pressed={allowQueueAdds}
                disabled={lockPending || queuePermissionPending || sync.isOffline}
                onClick={() => void toggleQueueContributions()}
                className="rounded-full gap-1.5 h-8 text-xs font-semibold shadow-2xs transition-all"
                title={t("Thành viên chỉ được thêm video; chủ phòng giữ quyền điều khiển và quản lý hàng đợi.")}
              >
                {queuePermissionPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ListPlus className="h-3.5 w-3.5 text-purple-500" />
                )}
                <span>{t("Cho thêm video")}</span>
                {allowQueueAdds && <Check className="h-3.5 w-3.5 text-rose-500" />}
              </Button>
            )}

            {/* Host Dance Stage Toggle */}
            {isHost && (
              <Button
                type="button"
                size="sm"
                variant={stageHook.stage.enabled ? "default" : "outline"}
                onClick={() => void stageHook.toggleStage(!stageHook.stage.enabled)}
                className={cn(
                  "rounded-full gap-1.5 h-8 text-xs font-semibold shadow-2xs transition-all",
                  stageHook.stage.enabled
                    ? "bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-rose-600/25"
                    : "hover:border-rose-500/40 hover:text-rose-500"
                )}
                title={stageHook.stage.enabled ? t("Tắt sân khấu mèo nhảy") : t("Bật sân khấu mèo nhảy")}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>{stageHook.stage.enabled ? t("Sân khấu: Bật") : t("Bật sân khấu")}</span>
              </Button>
            )}

            {/* Share room link */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyLink}
              className="rounded-full gap-1.5 h-8 text-xs font-semibold hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-500 shadow-2xs transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-rose-500" />
                  <span>{t("Đã chép link")}</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{t("Chia sẻ")}</span>
                </>
              )}
            </Button>

            {/* YouTube link */}
            <Button asChild size="sm" variant="ghost" className="rounded-full h-8 text-xs text-muted-foreground hover:text-foreground">
              <Link
                href={video.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>YouTube</span>
              </Link>
            </Button>

            {/* Delete room (host only) */}
            {isHost && (
              <DeleteRoomButton
                code={code}
                title={roomTitle}
                onDeleted={() => {
                  try {
                    window.localStorage.removeItem(getRoomJoinedKey(code));
                  } catch {}
                  void leave();
                  router.replace("/rooms");
                }}
              />
            )}

            {/* Leave room */}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={leaving}
              onClick={() => void handleLeave()}
            >
              {leaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span>{t("Rời phòng")}</span>
            </Button>
          </div>
        </div>
      )}

      {sync.isOffline && !sync.hasConnected && !sync.isClosed ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground"
        >
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          {sync.showSyncWarning
            ? t("Kết nối đang mất nhiều thời gian hơn dự kiến…")
            : t("Đang kết nối với phòng…")}
        </p>
      ) : sync.showSyncWarning ? (
        <p
          role="status"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm"
        >
          {t(
            "Đồng bộ phòng đang gián đoạn. Video vẫn tiếp tục; đang thử lại.",
          )}{" "}
        </p>
      ) : null}

      <div className={`relative grid items-start gap-5 ${focused && panelCollapsed ? "lg:grid-cols-[minmax(0,1fr)_44px]" : "lg:grid-cols-[minmax(0,1fr)_360px]"} ${focused ? "lg:min-h-0 lg:flex-1 lg:grid-rows-[minmax(0,1fr)]" : ""}`}>
        <div className={focused ? "min-w-0 lg:h-full lg:min-h-0 lg:overflow-y-auto space-y-3" : "relative group min-w-0 space-y-3"}>
          {!focused && <div className="ambient-glow opacity-50 dark:opacity-85" aria-hidden="true" />}
          <SyncPlayer
            fillHeight={focused && !stageHook.stage.enabled}
            compact={stageHook.stage.enabled}
            videoId={room.video.videoId}
            onReady={(handle) => {
              handleRef.current = handle;
              currentVideoRef.current = room.video.videoId;
              setPlayerReady(true);
            }}
            onStateChange={(playing, currentTime) => {
              // Ignore the events caused by our own sync corrections.
              if (document.hidden || Date.now() < suppressUntilRef.current) return;
              void pushPlayback({
                isPlaying: playing,
                positionSeconds: currentTime,
              }, true);
            }}
            onEnded={(id, duration) => {
              if (
                id !== currentVideoRef.current ||
                currentGenerationRef.current === null ||
                !Number.isFinite(duration) ||
                duration <= 0
              )
                return;
              endedRef.current = {
                generation: currentGenerationRef.current,
                duration,
                anchor: sync.playback?.lastSyncAt ?? "",
                lastSent: 0,
              };
              void reportEnded();
            }}
          />

          {/* Sân Khấu Mèo Nhảy */}
          <RoomStage
            stage={stageHook.stage}
            messages={sync.messages}
            isHost={isHost}
            isOnStage={stageHook.isOnStage}
            isPendingApproval={stageHook.isPendingApproval}
            onToggleStage={stageHook.toggleStage}
            onSetLimit={stageHook.setLimit}
            onRequestJoin={stageHook.requestJoin}
            onCancelRequest={stageHook.cancelRequest}
            onApproveRequest={stageHook.approveRequest}
            onRejectRequest={stageHook.rejectRequest}
            onApproveAll={stageHook.approveAll}
            onLeaveStage={stageHook.leave}
            onClearStage={stageHook.clear}
          />

          {!focused && (
            <div className="rounded-2xl border border-border/80 bg-card/70 backdrop-blur-xl p-4 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-500/20 to-purple-500/20 text-rose-500 font-bold border border-rose-500/20 text-sm">
                    {(video.channel || "V").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold leading-snug text-foreground">
                      {video.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="font-medium text-foreground/90">{video.channel}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t("Đồng bộ realtime")}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-1.5 h-8 px-3 text-xs font-semibold shadow-2xs hover:bg-muted hover:border-rose-500/40 hover:text-rose-500 transition-all"
                    onClick={() => setFocused(true)}
                  >
                    <Maximize2 className="h-3.5 w-3.5 text-rose-500" />
                    <span>{t("Giản lược")}</span>
                  </Button>
                </div>
              </div>

              {/* Activity / Control Status pill */}
              <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                {canControl ? (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    {activity
                      ? activity
                      : hostOnlyControl
                        ? t("Bạn đang khoá phòng: chỉ bạn điều khiển được.")
                        : t("Mọi người đều có thể phát, tạm dừng, tua và đổi video.")}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-amber-500 font-medium">
                    <Lock className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("Chủ phòng đang khoá điều khiển.")} {activity ? activity + "." : ""}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className={focused
            ? `sticky bottom-0 z-[60] flex justify-end gap-2 bg-background py-2 lg:absolute lg:right-0 lg:py-0 ${panelCollapsed ? "lg:flex-col" : ""}`
            : "flex items-center justify-between gap-3"}>
          {!focused && <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm text-muted-foreground">{video.channel}</p>
            {canControl ? (
            <p className="text-xs text-muted-foreground">
              {activity
                ? activity
                : hostOnlyControl
                  ? t("Bạn đang khoá phòng: chỉ bạn điều khiển được.")
                  : t(
                      "Ai trong phòng cũng phát, tạm dừng, tua và đổi video được.",
                    )}
            </p>
          ) : (
            <p className="flex items-start gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {t(
                  "Chủ phòng đang khoá điều khiển. Trình phát của bạn sẽ tự bám theo chủ phòng.",
                )}{" "}
                {activity ? " " + activity + "." : ""}
              </span>
            </p>
          )}</div>}
            {focused && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="relative h-11 w-11 shrink-0 bg-background shadow-sm hover:bg-muted"
                aria-label={t(panelCollapsed ? "Hiện khung hoạt động" : "Thu gọn khung hoạt động")}
                title={t(panelCollapsed ? "Hiện khung hoạt động" : "Thu gọn khung hoạt động")}
                aria-expanded={!panelCollapsed}
                aria-controls="room-activity-panel"
                onClick={() => { if (panelCollapsed && unreadMessages) setTab("chat"); setPanelCollapsed(value => !value); }}
              >
                {panelCollapsed ? <PanelRightOpen aria-hidden="true" className="h-4 w-4" /> : <PanelRightClose aria-hidden="true" className="h-4 w-4" />}
                {panelCollapsed && unreadMessages > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-[10px] leading-5 text-primary-foreground">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size={focused && panelCollapsed ? "icon" : "default"}
              aria-label={t(focused ? "Thoát giản lược" : "Giản lược")}
              title={t(focused ? "Thoát giản lược" : "Giản lược")}
              className={"min-h-11 shrink-0 bg-background shadow-sm hover:bg-muted " + (focused && panelCollapsed ? "h-11 w-11 p-0" : "")}
              onClick={() => setFocused(value => !value)}
              aria-pressed={focused}
            >
              {focused ? <Minimize2 aria-hidden="true" className={panelCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} /> : <Maximize2 aria-hidden="true" className="mr-2 h-4 w-4" />}
              {!(focused && panelCollapsed) && t(focused ? "Thoát giản lược" : "Giản lược")}
            </Button>
          </div>
          {!focused && <RoomRelatedVideos key={`${code}:${video.videoId}`} code={code} videoId={video.videoId} onPick={changeVideo} onEnqueue={enqueueVideo} enqueueDisabled={!canEnqueue || sync.isOffline} disabled={!canControl || sync.isOffline} />}
        </div>

        <Tabs
          id="room-activity-panel"
          value={tab}
          onValueChange={(value) => setTab(value as typeof tab)}
          className={focused && panelCollapsed ? "hidden" : `min-w-0 space-y-2 ${focused ? "lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:pb-14" : ""}`}
        >
          <TabsList
            className="grid h-11 w-full shrink-0 grid-cols-3 rounded-full bg-muted/70 p-1 border border-border/80 backdrop-blur-md"
            aria-label={t("Hoạt động trong phòng")}
          >
            <TabsTrigger
              value="chat"
              className="h-9 min-w-0 gap-1.5 rounded-full px-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-rose-600/30"
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("Trò chuyện")}</span>
              {unreadMessages > 0 && (
                <span className="shrink-0 rounded-full bg-white/25 px-1.5 text-[10px] font-bold leading-4" aria-label={t("{count} tin nhắn mới", { count: unreadMessages })}>
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="h-9 min-w-0 gap-1.5 rounded-full px-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-rose-600/30"
            >
              {canControl ? (
                <Search className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Lock className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{t("Tìm video")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="queue"
              className="h-9 min-w-0 gap-1.5 rounded-full px-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-rose-600/30"
            >
              <ListPlus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("Hàng đợi")}</span>
              <span className="rounded-full bg-muted/80 data-[state=active]:bg-white/25 px-1.5 text-[10px] font-bold tabular-nums">
                {sync.queue.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="chat"
            forceMount
            className={`mt-0 data-[state=inactive]:hidden ${focused ? "lg:min-h-0 lg:flex-1" : ""}`}
          >
            <RoomChat
              active={tab === "chat" && !(focused && panelCollapsed)}
              historyReady={sync.hasConnected}
              onUnreadChange={setUnreadMessages}
              fillHeight={focused}
              messages={sync.messages}
              canChat={Boolean(currentUserId)}
              connectionReady={!sync.isOffline}
              currentUserId={currentUserId}
              currentUser={{ name: identity.name, image: session?.user?.image ?? null }}
              onSend={onSend}
            />
          </TabsContent>
          <TabsContent value="search" className={`mt-0 ${focused ? "lg:min-h-0 lg:flex-1" : ""}`}>
            <RoomSearch
              fillHeight={focused}
              onPick={changeVideo}
              onEnqueue={async (item) => { await enqueueVideo(item); }}
              activeVideoId={video.videoId}
              disabled={!canControl || sync.isOffline}
              enqueueDisabled={!canEnqueue || sync.isOffline}
              locked={!canControl}
            />
          </TabsContent>
          <TabsContent value="queue" className={`mt-0 ${focused ? "lg:min-h-0 lg:flex-1" : ""}`}>
            <RoomQueue
              fillHeight={focused}
              items={sync.queue}
              disabled={!canControl || sync.isOffline}
              canContribute={canEnqueue && !sync.isOffline}
              pending={queuePending}
              onMove={(id, direction) =>
                void changeQueue({ action: "move", id, direction }).then(
                  (changed) => {
                    if (changed)
                      toast({ title: t("Đã cập nhật thứ tự hàng đợi") });
                  },
                )
              }
              onRemove={(id) => void changeQueue({ action: "remove", id })}
              onNext={() =>
                void changeQueue({
                  action: "next",
                  generation: sync.playbackGeneration,
                })
              }
              onSearch={() => setTab("search")}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
