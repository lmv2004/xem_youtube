"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Crown,
  Settings2,
  X,
  Check,
  Plus,
  Minus,
  Trash2,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Music2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CAT_DANCE_MEMES, type CatDanceMeme } from "@/lib/cat-memes";
import type {
  StageParticipant,
  StageRequest,
  RoomStageState,
} from "@/lib/room-stage";
import type { RoomMessageDto } from "@/lib/rooms";
import { useTranslations } from "@/components/locale-provider";
import { StageLightingControls, StageLightingRig } from "./stage-lighting-controls";
import { normalizeStageLighting, stageLightingStyle, type StageLighting } from "@/lib/stage-lighting";
import { cn } from "@/lib/utils";

type ActiveBubble = {
  text: string;
  expiresAt: number;
};

type RoomStageProps = {
  stage: RoomStageState;
  isHost: boolean;
  isOnStage: boolean;
  isPendingApproval: boolean;
  myParticipant?: StageParticipant;
  messages?: RoomMessageDto[];
  videoTitle?: string;
  channel?: string;
  focused?: boolean;
  isDocked?: boolean;
  onToggleFocused?: () => void;
  onToggleStage: (enabled: boolean) => Promise<void>;
  onSetLimit: (max: number) => Promise<void>;
  onSetLighting: (lighting: StageLighting) => Promise<boolean>;
  onRequestJoin: (cat: CatDanceMeme) => Promise<void>;
  onCancelRequest: () => Promise<void>;
  onApproveRequest: (clientId: string, userId?: string | null) => Promise<void>;
  onRejectRequest: (clientId: string, userId?: string | null) => Promise<void>;
  onApproveAll: () => Promise<void>;
  onLeaveStage: (clientId?: string) => Promise<void>;
  onClearStage: () => Promise<void>;
};

export function RoomStage({
  stage,
  isHost,
  isOnStage,
  isPendingApproval,
  myParticipant,
  messages = [],
  videoTitle,
  channel,
  focused = false,
  isDocked = true,
  onToggleFocused,
  onToggleStage,
  onSetLimit,
  onSetLighting,
  onRequestJoin,
  onCancelRequest,
  onApproveRequest,
  onRejectRequest,
  onApproveAll,
  onLeaveStage,
  onClearStage,
}: RoomStageProps) {
  const t = useTranslations();
  const [selectCatOpen, setSelectCatOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<CatDanceMeme>(
    CAT_DANCE_MEMES[0],
  );
  const [actionPending, setActionPending] = useState(false);

  // Chat speech bubbles above cats
  const [bubbles, setBubbles] = useState<Record<string, ActiveBubble>>({});
  const processedMsgIdsRef = useRef<Set<string>>(new Set());

  const lighting = normalizeStageLighting(stage.lighting);
  const { enabled, maxParticipants, participants, requests } = stage;

  // Track chat messages and assign bubbles to active dancers
  useEffect(() => {
    if (!messages || messages.length === 0 || !enabled) return;
    const now = Date.now();
    let hasUpdates = false;
    const nextBubbles = { ...bubbles };

    for (const msg of messages) {
      if (processedMsgIdsRef.current.has(msg.id)) continue;
      processedMsgIdsRef.current.add(msg.id);

      const msgTime = new Date(msg.createdAt).getTime();
      // Only process recent messages
      if (now - msgTime > 15000) continue;

      // Find matching dancer on stage by userId or author name
      const dancer = participants.find(
        (p) =>
          (p.userId && msg.author.id && p.userId === msg.author.id) ||
          (msg.author.name &&
            p.name.trim().toLowerCase() ===
              msg.author.name.trim().toLowerCase()),
      );

      if (dancer) {
        nextBubbles[dancer.clientId] = {
          text: msg.body,
          expiresAt: now + 6500, // Display bubble for 6.5s
        };
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      setBubbles(nextBubbles);
    }
  }, [messages, participants, enabled, bubbles]);

  // Clean up expired chat bubbles every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      let hasExpired = false;
      const nextBubbles: Record<string, ActiveBubble> = {};
      for (const [id, bubble] of Object.entries(bubbles)) {
        if (bubble.expiresAt > now) {
          nextBubbles[id] = bubble;
        } else {
          hasExpired = true;
        }
      }
      if (hasExpired) {
        setBubbles(nextBubbles);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [bubbles]);

  if (!enabled) return null;

  const isFull = participants.length >= maxParticipants;

  const handleJoinClick = () => {
    if (myParticipant) {
      const existingCat = CAT_DANCE_MEMES.find(
        (c) => c.id === myParticipant.catId,
      );
      if (existingCat) setSelectedCat(existingCat);
    }
    setSelectCatOpen(true);
  };

  const handleConfirmJoin = async () => {
    setActionPending(true);
    try {
      await onRequestJoin(selectedCat);
      setSelectCatOpen(false);
    } finally {
      setActionPending(false);
    }
  };

  const handleAdjustLimit = async (delta: number) => {
    const next = Math.max(1, Math.min(12, maxParticipants + delta));
    if (next !== maxParticipants) {
      await onSetLimit(next);
    }
  };

  return (
    <div
      className={cn(
        "concert-deck stage-light-surface overflow-hidden rounded-2xl border border-white/10 bg-[#101119] text-slate-100",
        isDocked && "rounded-t-none border-t-0",
      )}
      data-light-type={lighting.type}
      data-light-motion={lighting.motion}
      data-light-pulse={lighting.pulse}
      style={stageLightingStyle(lighting) as React.CSSProperties}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-400/25 bg-violet-400/10 text-violet-200">
            <Music2 aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-wide">
              {t("Sân khấu trực tiếp")}
            </h2>
            <p
              className="mt-0.5 truncate text-xs text-slate-400"
              title={videoTitle}
            >
              {videoTitle || t("Cùng nghe, cùng nhảy")}
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs tabular-nums text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {t("{count}/{max} đang biểu diễn", {
            count: participants.length,
            max: maxParticipants,
          })}
        </span>
      </div>
      <div className="concert-floor relative isolate overflow-hidden px-3 pb-5 pt-16 sm:px-6 sm:pb-6 sm:pt-20">
        <StageLightingRig />
        <div className="concert-backdrop" aria-hidden="true" />
        {participants.length === 0 && (
          <div className="relative z-10 mx-auto mb-5 max-w-xs text-center">
            <p className="text-base font-semibold text-slate-100">
              {t("Sân khấu đang chờ bạn")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {t("Chọn một chú mèo và cùng nhảy theo nhạc.")}
            </p>
          </div>
        )}
        <div className="relative z-10 mx-auto flex max-w-4xl flex-wrap items-end justify-center gap-x-3 gap-y-8 sm:gap-x-6">
          {participants.map((p) => {
            const bubble = bubbles[p.clientId];
            return (
              <div
                key={p.clientId}
                className="concert-performer group/cat relative flex w-[calc((100%_-_1.5rem)/3)] max-w-32 flex-col items-center sm:w-28"
              >
                {bubble && (
                  <div className="pointer-events-none absolute -top-9 left-1/2 z-30 w-36 -translate-x-1/2 rounded-xl border border-violet-300/40 bg-slate-100 px-3 py-2 text-center text-xs text-slate-950 shadow-lg">
                    <p className="line-clamp-2 break-words">{bubble.text}</p>
                  </div>
                )}
                {isHost && (
                  <button
                    type="button"
                    onClick={() => void onLeaveStage(p.clientId)}
                    aria-label={t("Mời {name} xuống sân khấu", {
                      name: p.name,
                    })}
                    title={t("Mời {name} xuống sân khấu", { name: p.name })}
                    className="absolute right-0 top-0 z-20 hidden h-9 w-9 place-items-center sm:grid rounded-full border border-white/15 bg-slate-900/90 text-slate-300 opacity-100 hover:bg-red-950 hover:text-white focus-visible:opacity-100 sm:opacity-0 sm:group-hover/cat:opacity-100"
                  >
                    <X aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="relative aspect-square w-full overflow-hidden rounded-lg drop-shadow-[0_10px_12px_rgba(0,0,0,.5)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.catGifUrl}
                    alt={p.catName}
                    className="absolute inset-0 h-full w-full select-none object-contain"
                    loading="eager"
                  />
                </div>
                <div className="concert-podium" aria-hidden="true" />
                <div className="mt-2 flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1.5 text-xs">
                  <Avatar className="h-4 w-4 shrink-0">
                    <AvatarImage src={p.image ?? undefined} alt="" />
                    <AvatarFallback className="bg-violet-900 text-[9px] text-white">
                      {p.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate" title={p.name}>
                    {p.name}
                  </span>
                  {p.isHost && (
                    <Crown
                      aria-label={t("Chủ phòng")}
                      className="h-3 w-3 shrink-0 text-amber-300"
                    />
                  )}
                </div>
              </div>
            );
          })}
          {!isOnStage && !isFull && (
            <button
              type="button"
              onClick={handleJoinClick}
              className="relative z-10 mb-1 flex min-h-28 w-24 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-300/30 bg-violet-400/5 px-2 text-xs font-medium text-violet-200 transition-colors hover:border-violet-300/70 hover:bg-violet-400/15 sm:w-28"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-300/10">
                <Plus aria-hidden="true" className="h-4 w-4" />
              </span>
              {t("Lên sân khấu")}
            </button>
          )}
        </div>
        <div className="concert-stage-edge" aria-hidden="true" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[.025] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          {isOnStage ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-11 border border-white/15 bg-white/10 text-slate-100 hover:bg-white/20"
                onClick={handleJoinClick}
              >
                {t("Đổi mèo")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={() => void onLeaveStage()}
              >
                {t("Rời sân khấu")}
              </Button>
            </>
          ) : isPendingApproval ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 whitespace-normal text-left bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
              onClick={() => void onCancelRequest()}
            >
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              {t("Đang chờ duyệt · Hủy")}
            </Button>
          ) : isFull ? (
            <span className="text-xs text-slate-400">
              {t("Sân khấu đã đầy")}
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              {t("Chọn một chú mèo và cùng nhảy theo nhạc.")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isHost && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11 border-white/15 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
              onClick={() => setManageOpen(true)}
            >
              <Settings2 aria-hidden="true" className="h-4 w-4" />
              {t("Quản lý sân khấu")}
              {requests.length > 0 && (
                <span className="rounded-full bg-violet-500 px-1.5 text-xs text-white">
                  {requests.length}
                </span>
              )}
            </Button>
          )}
          {onToggleFocused && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-11 text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={onToggleFocused}
            >
              {focused ? (
                <Minimize2 aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Maximize2 aria-hidden="true" className="h-4 w-4" />
              )}
              {t(focused ? "Thoát giản lược" : "Giản lược")}
            </Button>
          )}
        </div>
      </div>

      {/* DIALOG: Chọn Meme Mèo Nhảy */}
      <Dialog open={selectCatOpen} onOpenChange={setSelectCatOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="h-5 w-5 text-rose-500" />
              <span>Chọn meme mèo nhảy của bạn</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Chọn một bé mèo nhảy từ bộ sưu tập GIPHY Cat Dance để đại diện cho
              bạn trên sàn nhảy!
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
            {CAT_DANCE_MEMES.map((cat) => {
              const isSelected = selectedCat.id === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={cn(
                    "flex flex-col items-center rounded-xl border p-2.5 text-center transition-all cursor-pointer relative",
                    isSelected
                      ? "border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30 shadow-md"
                      : "border-border/60 bg-card/60 hover:border-border hover:bg-muted/40",
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <div className="relative h-20 w-20 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cat.gifUrl}
                      alt={cat.name}
                      className="h-full w-full object-contain pointer-events-none"
                    />
                  </div>
                  <span className="mt-2 text-xs font-bold text-foreground">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {cat.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <a
              href="https://giphy.com/explore/cat-dance"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-muted-foreground hover:text-rose-500 flex items-center gap-1 transition-colors"
            >
              <span>Khám phá thêm trên GIPHY</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectCatOpen(false)}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                disabled={actionPending}
                onClick={() => void handleConfirmJoin()}
              >
                {actionPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isHost ? (
                  "Lên sân khấu ngay"
                ) : (
                  "Gửi yêu cầu lên sân khấu"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Quản lý sân khấu (Chỉ Host) */}
      {isHost && (
        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Settings2 className="h-5 w-5 text-rose-500" />
                <span>Quản lý sàn nhảy mèo</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Chỉnh số lượng người tối đa và duyệt yêu cầu lên sân khấu của
                các thành viên.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <StageLightingControls value={stage.lighting} onSave={onSetLighting} />
              {/* Cài đặt sức chứa sân khấu */}
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 p-3">
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Số lượng tối đa trên sân khấu
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Từ 1 đến 12 người cùng nhảy
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={maxParticipants <= 1}
                    onClick={() => void handleAdjustLimit(-1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-8 text-center font-bold text-sm tabular-nums">
                    {maxParticipants}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={maxParticipants >= 12}
                    onClick={() => void handleAdjustLimit(1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Danh sách yêu cầu chờ duyệt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span>Yêu cầu lên sân khấu</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {requests.length}
                    </Badge>
                  </h4>
                  {requests.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-rose-500 hover:text-rose-600 px-2 font-semibold"
                      onClick={() => void onApproveAll()}
                    >
                      Duyệt tất cả
                    </Button>
                  )}
                </div>

                {requests.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center rounded-lg border border-dashed border-border/60">
                    Không có yêu cầu nào đang chờ.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {requests.map((r) => (
                      <div
                        key={r.clientId}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-card/60 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-7 w-7 shrink-0">
                            {r.image ? (
                              <AvatarImage src={r.image} alt={r.name} />
                            ) : (
                              <AvatarFallback className="text-xs bg-rose-600 text-white">
                                {r.name.slice(0, 1)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{r.name}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                              <span>Mèo:</span>
                              <span className="font-medium text-foreground/80">
                                {r.catName}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
                            onClick={() =>
                              void onApproveRequest(r.clientId, r.userId)
                            }
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Duyệt
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              void onRejectRequest(r.clientId, r.userId)
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Danh sách người đang trên sân khấu */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span>Đang trên sân khấu</span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {participants.length}
                    </Badge>
                  </h4>
                  {participants.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-destructive hover:text-destructive/80 px-2 font-semibold"
                      onClick={() => void onClearStage()}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hạ tất cả
                    </Button>
                  )}
                </div>

                {participants.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center rounded-lg border border-dashed border-border/60">
                    Chưa có ai trên sân khấu.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {participants.map((p) => (
                      <div
                        key={p.clientId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6 shrink-0">
                            {p.image ? (
                              <AvatarImage src={p.image} alt={p.name} />
                            ) : (
                              <AvatarFallback className="text-[10px] bg-rose-600 text-white">
                                {p.name.slice(0, 1)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <span className="font-semibold truncate">
                            {p.name}
                          </span>
                          {p.isHost && (
                            <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                          <span className="text-[10px] text-muted-foreground truncate">
                            ({p.catName})
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                          onClick={() => void onLeaveStage(p.clientId)}
                        >
                          Mời xuống
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tắt sân khấu */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Tắt sân khấu để ẩn khỏi phòng:
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={async () => {
                    await onToggleStage(false);
                    setManageOpen(false);
                  }}
                >
                  Tắt tính năng sân khấu
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
