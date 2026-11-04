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
    }, 2500);

    return () => {
      activeRef.current = false;
      clearInterval(interval);
    };
  }, [fetchStage]);

  const sendStageAction = useCallback(
    async (payload: Record<string, unknown>, successMessage?: string) => {
      if (!code || !clientId) return;
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
    [code, clientId],
  );

  const toggleStage = useCallback(
    async (enabled: boolean) => {
      await sendStageAction(
        { action: "toggle", enabled },
        enabled ? "Đã bật tính năng sân khấu mèo nhảy! 🎉" : "Đã tắt sân khấu",
      );
    },
    [sendStageAction],
  );

  const setLimit = useCallback(
    async (maxParticipants: number) => {
      await sendStageAction(
        { action: "set_limit", maxParticipants },
        `Đã đặt giới hạn sân khấu là ${maxParticipants} người`,
      );
    },
    [sendStageAction],
  );

  const requestJoin = useCallback(
    async (cat: CatDanceMeme) => {
      if (!clientId) return;
      await sendStageAction(
        {
          action: "request_join",
          clientId,
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
    [sendStageAction, clientId, displayName, avatarUrl, isHost],
  );

  const cancelRequest = useCallback(async () => {
    if (!clientId) return;
    await sendStageAction(
      { action: "cancel_request", clientId },
      "Đã huỷ yêu cầu lên sân khấu",
    );
  }, [sendStageAction, clientId]);

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
      const idToLeave = targetClientId || clientId;
      if (!idToLeave) return;
      await sendStageAction(
        { action: "leave", clientId: idToLeave },
        idToLeave === clientId ? "Bạn đã rời khỏi sân khấu" : "Đã mời thành viên xuống sân khấu",
      );
    },
    [sendStageAction, clientId],
  );

  const clear = useCallback(async () => {
    await sendStageAction(
      { action: "clear" },
      "Đã đưa tất cả mọi người xuống sân khấu",
    );
  }, [sendStageAction]);

  const isOnStage = Boolean(
    clientId && stage.participants.some((p) => p.clientId === clientId),
  );
  const isPendingApproval = Boolean(
    clientId && stage.requests.some((r) => r.clientId === clientId),
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
