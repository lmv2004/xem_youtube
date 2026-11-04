"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RoomStageState, StageParticipant, StageRequest } from "@/lib/room-stage";
import type { CatDanceMeme } from "@/lib/cat-memes";
import { toast } from "sonner";

const defaultStageState: RoomStageState = {
  enabled: false,
  maxParticipants: 6,
  participants: [],
  requests: [],
  lastUpdatedAt: 0,
};

type UseRoomStageProps = {
  code: string;
  clientId: string | null;
  isHost: boolean;
  displayName: string;
  avatarUrl?: string | null;
  disabled?: boolean;
};

export function useRoomStage({
  code,
  clientId,
  isHost,
  displayName,
  avatarUrl,
  disabled = false,
}: UseRoomStageProps) {
  const [stage, setStage] = useState<RoomStageState>(defaultStageState);
  const [loading, setLoading] = useState(false);
  const activeRef = useRef(true);

  const getEffectiveClientId = useCallback(() => {
    return clientId || (typeof window !== "undefined" ? window.sessionStorage?.getItem("stage:temp:client") : null) || "host-client";
  }, [clientId]);

  const fetchStage = useCallback(async () => {
    if (!code || disabled) return;
    try {
      const res = await fetch(`/api/rooms/${code}/stage`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as RoomStageState;
        if (activeRef.current) {
          setStage(data);
        }
      }
    } catch {
      // Ignore network errors in polling
    }
  }, [code, disabled]);

  // Polling loop
  useEffect(() => {
    activeRef.current = true;
    void fetchStage();

    const interval = setInterval(() => {
      if (!document.hidden && activeRef.current) {
        void fetchStage();
      }
    }, 2000);

    return () => {
      activeRef.current = false;
      clearInterval(interval);
    };
  }, [fetchStage]);

  const sendStageAction = useCallback(
    async (payload: Record<string, unknown>, successMessage?: string) => {
      if (!code) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/rooms/${code}/stage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = (await res.json()) as RoomStageState;
          setStage(updated);
          if (successMessage) {
            toast.success(successMessage);
          }
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.message || "Không thể thực hiện hành động trên sân khấu");
        }
      } catch {
        toast.error("Lỗi kết nối máy chủ");
      } finally {
        setLoading(false);
      }
    },
    [code],
  );

  const toggleStage = useCallback(
    async (enabled: boolean) => {
      const cid = getEffectiveClientId();
      // Optimistic update
      setStage((prev) => ({
        ...prev,
        enabled,
        participants:
          enabled && prev.participants.length === 0
            ? [
                {
                  clientId: cid,
                  userId: null,
                  name: displayName || "Chủ phòng (DJ)",
                  image: avatarUrl || null,
                  isHost,
                  catId: "GK7dGndK4kyOozR9Xk",
                  catGifUrl: "https://media.giphy.com/media/GK7dGndK4kyOozR9Xk/giphy.gif",
                  catName: "Mèo Disco Neon",
                  joinedAt: Date.now(),
                },
              ]
            : prev.participants,
      }));

      await sendStageAction(
        { action: "toggle", enabled, clientId: cid },
        enabled ? "Đã bật sân khấu mèo nhảy! 🎉" : "Đã tắt sân khấu",
      );
    },
    [sendStageAction, getEffectiveClientId, displayName, avatarUrl, isHost],
  );

  const setLimit = useCallback(
    async (maxParticipants: number) => {
      setStage((prev) => ({ ...prev, maxParticipants }));
      await sendStageAction(
        { action: "set_limit", maxParticipants },
        `Đã đặt giới hạn sân khấu là ${maxParticipants} người`,
      );
    },
    [sendStageAction],
  );

  const requestJoin = useCallback(
    async (cat: CatDanceMeme) => {
      const cid = getEffectiveClientId();
      // Optimistic update
      if (isHost) {
        setStage((prev) => ({
          ...prev,
          participants: [
            ...prev.participants.filter((p) => p.clientId !== cid),
            {
              clientId: cid,
              name: displayName,
              image: avatarUrl,
              isHost: true,
              catId: cat.id,
              catGifUrl: cat.gifUrl,
              catName: cat.name,
              joinedAt: Date.now(),
            },
          ],
        }));
      } else {
        setStage((prev) => ({
          ...prev,
          requests: [
            ...prev.requests.filter((r) => r.clientId !== cid),
            {
              clientId: cid,
              name: displayName,
              image: avatarUrl,
              isHost: false,
              catId: cat.id,
              catGifUrl: cat.gifUrl,
              catName: cat.name,
              requestedAt: Date.now(),
            },
          ],
        }));
      }

      await sendStageAction(
        {
          action: "request_join",
          clientId: cid,
          name: displayName,
          image: avatarUrl,
          catId: cat.id,
          catGifUrl: cat.gifUrl,
          catName: cat.name,
        },
        isHost
          ? "Bạn đã lên sân khấu quẩy! 💃"
          : "Đã gửi yêu cầu lên sân khấu tới chủ phòng! 🐱",
      );
    },
    [sendStageAction, getEffectiveClientId, displayName, avatarUrl, isHost],
  );

  const cancelRequest = useCallback(async () => {
    const cid = getEffectiveClientId();
    setStage((prev) => ({
      ...prev,
      requests: prev.requests.filter((r) => r.clientId !== cid),
    }));
    await sendStageAction(
      { action: "cancel_request", clientId: cid },
      "Đã huỷ yêu cầu lên sân khấu",
    );
  }, [sendStageAction, getEffectiveClientId]);

  const approveRequest = useCallback(
    async (targetClientId: string) => {
      await sendStageAction(
        { action: "approve", clientId: targetClientId },
        "Đã duyệt thành viên lên sân khấu! 🐾",
      );
    },
    [sendStageAction],
  );

  const rejectRequest = useCallback(
    async (targetClientId: string) => {
      setStage((prev) => ({
        ...prev,
        requests: prev.requests.filter((r) => r.clientId !== targetClientId),
      }));
      await sendStageAction(
        { action: "reject", clientId: targetClientId },
        "Đã từ chối yêu cầu",
      );
    },
    [sendStageAction],
  );

  const approveAll = useCallback(async () => {
    await sendStageAction(
      { action: "approve_all" },
      "Đã duyệt tất cả yêu cầu lên sân khấu! 🎉",
    );
  }, [sendStageAction]);

  const leave = useCallback(
    async (targetClientId?: string) => {
      const cid = targetClientId || getEffectiveClientId();
      setStage((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.clientId !== cid),
      }));
      await sendStageAction(
        { action: "leave", clientId: cid },
        cid === clientId ? "Bạn đã rời khỏi sân khấu" : "Đã mời thành viên xuống sân khấu",
      );
    },
    [sendStageAction, getEffectiveClientId, clientId],
  );

  const clear = useCallback(async () => {
    setStage((prev) => ({ ...prev, participants: [], requests: [] }));
    await sendStageAction(
      { action: "clear" },
      "Đã đưa tất cả mọi người xuống sân khấu",
    );
  }, [sendStageAction]);

  const currentCid = getEffectiveClientId();
  const isOnStage = Boolean(
    stage.participants.some((p) => p.clientId === currentCid || (clientId && p.clientId === clientId)),
  );
  const isPendingApproval = Boolean(
    stage.requests.some((r) => r.clientId === currentCid || (clientId && r.clientId === clientId)),
  );

  return {
    stage,
    loading,
    isOnStage,
    isPendingApproval,
    toggleStage,
    setLimit,
    requestJoin,
    cancelRequest,
    approveRequest,
    rejectRequest,
    approveAll,
    leave,
    clear,
    refresh: fetchStage,
  };
}
