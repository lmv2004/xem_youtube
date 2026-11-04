"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RoomStageState } from "@/lib/room-stage";
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
  clientToken?: string;
  clientId: string | null;
  userId?: string | null;
  isHost: boolean;
  displayName: string;
  avatarUrl?: string | null;
  externalStage?: RoomStageState;
  disabled?: boolean;
};

export function useRoomStage({
  code,
  clientId,
  userId,
  isHost,
  displayName,
  avatarUrl,
  externalStage,
  clientToken,
  disabled = false,
}: UseRoomStageProps) {
  const [stage, setStage] = useState<RoomStageState>(defaultStageState);
  const [loading, setLoading] = useState(false);
  const activeRef = useRef(true);

  // Synchronize immediately whenever external stage snapshot arrives via room sync
  useEffect(() => {
    if (!externalStage) return;
    setStage((prev) => {
      if (
        externalStage.lastUpdatedAt >= prev.lastUpdatedAt
      ) {
        return externalStage;
      }
      return prev;
    });
  }, [externalStage]);

  const getEffectiveClientId = useCallback(() => {
    if (clientId) return clientId;
    if (typeof window !== "undefined") {
      return (
        window.sessionStorage.getItem("xemphim:room:tab_client_id:v1") || ""
      );
    }
    return "";
  }, [clientId]);

  const fetchStage = useCallback(async () => {
    if (!code) return;
    try {
      const res = await fetch(`/api/rooms/${code}/stage`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as RoomStageState;
        if (activeRef.current) {
          setStage((prev) => {
            if (
              data.lastUpdatedAt >= prev.lastUpdatedAt
            ) {
              return data;
            }
            return prev;
          });
        }
      }
    } catch {
      // Ignore network errors in polling
    }
  }, [code]);

  // Room polling owns reads. Avoid a competing stage loop and out-of-order replies.
  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, [code]);

  const sendStageAction = useCallback(
    async (payload: Record<string, unknown>, successMessage?: string) => {
      if (!code || disabled) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/rooms/${code}/stage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, actorClientId: clientId, clientToken }),
        });
        if (res.ok) {
          const updated = (await res.json()) as RoomStageState;
          if (activeRef.current) {
            setStage(previous => updated.lastUpdatedAt >= previous.lastUpdatedAt ? updated : previous);
          }
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
    [code, disabled, clientId, clientToken],
  );

  const toggleStage = useCallback(
    async (enabled: boolean) => {
      const cid = getEffectiveClientId();
      await sendStageAction(
        { action: "toggle", enabled, clientId: cid },
        enabled ? "Đã bật sân khấu mèo nhảy! 🎉" : "Đã tắt sân khấu",
      );
    },
    [sendStageAction, getEffectiveClientId],
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
      const cid = getEffectiveClientId();
      if (!cid) {
        toast.error("Đang kết nối phòng, vui lòng thử lại sau giây lát");
        return;
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
    if (!cid) return;
    await sendStageAction(
      { action: "cancel_request", clientId: cid },
      "Đã huỷ yêu cầu lên sân khấu",
    );
  }, [sendStageAction, getEffectiveClientId]);

  const approveRequest = useCallback(
    async (targetClientId: string, targetUserId?: string | null) => {
      await sendStageAction(
        { action: "approve", clientId: targetClientId, userId: targetUserId },
        "Đã duyệt thành viên lên sân khấu! 🐾",
      );
    },
    [sendStageAction],
  );

  const rejectRequest = useCallback(
    async (targetClientId: string, targetUserId?: string | null) => {
      await sendStageAction(
        { action: "reject", clientId: targetClientId, userId: targetUserId },
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
      if (!cid) return;
      await sendStageAction(
        { action: "leave", clientId: cid },
        cid === clientId ? "Bạn đã rời khỏi sân khấu" : "Đã mời thành viên xuống sân khấu",
      );
    },
    [sendStageAction, getEffectiveClientId, clientId],
  );

  const clear = useCallback(async () => {
    await sendStageAction(
      { action: "clear" },
      "Đã đưa tất cả mọi người xuống sân khấu",
    );
  }, [sendStageAction]);

  const currentCid = getEffectiveClientId();
  const isOnStage = Boolean(
    stage.participants.some(
      (p) =>
        (currentCid && p.clientId === currentCid) ||
        (userId && p.userId && p.userId === userId),
    ),
  );
  const isPendingApproval = Boolean(
    stage.requests.some(
      (r) =>
        (currentCid && r.clientId === currentCid) ||
        (userId && r.userId && r.userId === userId),
    ),
  );
  const myParticipant = stage.participants.find(
    (p) =>
      (currentCid && p.clientId === currentCid) ||
      (userId && p.userId && p.userId === userId),
  );

  return {
    stage,
    loading,
    isOnStage,
    isPendingApproval,
    myParticipant,
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
