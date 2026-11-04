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
  Disc3,
  MessageSquare,
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
import type { StageParticipant, StageRequest, RoomStageState } from "@/lib/room-stage";
import type { RoomMessageDto } from "@/lib/rooms";
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
  messages?: RoomMessageDto[];
  onToggleStage: (enabled: boolean) => Promise<void>;
  onSetLimit: (max: number) => Promise<void>;
  onRequestJoin: (cat: CatDanceMeme) => Promise<void>;
  onCancelRequest: () => Promise<void>;
  onApproveRequest: (clientId: string) => Promise<void>;
  onRejectRequest: (clientId: string) => Promise<void>;
  onApproveAll: () => Promise<void>;
  onLeaveStage: (clientId?: string) => Promise<void>;
  onClearStage: () => Promise<void>;
};

export function RoomStage({
  stage,
  isHost,
  isOnStage,
  isPendingApproval,
  messages = [],
  onToggleStage,
  onSetLimit,
  onRequestJoin,
  onCancelRequest,
  onApproveRequest,
  onRejectRequest,
  onApproveAll,
  onLeaveStage,
  onClearStage,
}: RoomStageProps) {
  const [selectCatOpen, setSelectCatOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<CatDanceMeme>(CAT_DANCE_MEMES[0]);
  const [actionPending, setActionPending] = useState(false);

  // Chat speech bubbles above cats
  const [bubbles, setBubbles] = useState<Record<string, ActiveBubble>>({});
  const processedMsgIdsRef = useRef<Set<string>>(new Set());

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
          (msg.author.name && p.name.trim().toLowerCase() === msg.author.name.trim().toLowerCase()),
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
    <div className="relative rounded-2xl border-2 border-rose-500/40 bg-gradient-to-b from-card/95 via-purple-950/20 to-card/95 p-2.5 sm:p-3.5 shadow-2xl backdrop-blur-xl overflow-hidden group">
      {/* Dynamic Ambient Stage Atmosphere */}
      <div className="pointer-events-none absolute -top-14 left-1/4 h-32 w-1/2 rounded-full bg-gradient-to-r from-rose-500/30 via-pink-500/30 to-amber-500/25 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-10 right-1/4 h-24 w-1/3 rounded-full bg-purple-600/20 blur-3xl" />

      {/* Stage Header Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/70">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-rose-500/30">
            <Disc3 className="h-4 w-4 animate-spin text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-wide text-xs uppercase bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                Sàn Nhảy Mèo Quẩy Live 🐾
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
              <span>GIPHY Cat Dance</span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">
                {participants.length}/{maxParticipants} đang nhảy
              </span>
            </p>
          </div>
        </div>

        {/* Stage Header Controls */}
        <div className="flex items-center gap-1.5">
          {isOnStage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7.5 rounded-full border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold gap-1 shadow-sm"
              onClick={() => void onLeaveStage()}
            >
              <span>🐾 Xuống sàn</span>
            </Button>
          ) : isPendingApproval ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-semibold gap-1"
              onClick={() => void onCancelRequest()}
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Chờ duyệt (Huỷ)</span>
            </Button>
          ) : isFull && !isHost ? (
            <Badge variant="outline" className="h-7.5 rounded-full text-xs text-muted-foreground px-2.5">
              Sân khấu đầy ({maxParticipants})
            </Badge>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-7.5 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-md shadow-rose-600/30 gap-1 transition-all hover:scale-105 active:scale-95"
              onClick={handleJoinClick}
            >
              <Sparkles className="h-3 w-3 text-amber-200" />
              <span>Lên sàn nhảy 💃</span>
            </Button>
          )}

          {isHost && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="relative h-7.5 rounded-full border-border/80 bg-background/60 hover:bg-muted text-xs font-semibold gap-1 shadow-sm"
              onClick={() => setManageOpen(true)}
            >
              <Settings2 className="h-3 w-3 text-rose-500" />
              <span>Quản lý sàn</span>
              {requests.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {requests.length}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* SÀN NHẢY ÁNH ĐÈN & BEAMS (THE CONCERT DANCE FLOOR) */}
      <div className="relative mt-2 min-h-[155px] sm:min-h-[175px] rounded-xl border border-rose-500/30 bg-gradient-to-b from-slate-950/85 via-purple-950/40 to-slate-950/95 p-2 sm:p-3 flex flex-col justify-end overflow-hidden shadow-inner">
        {/* GIÀN ĐÈN SÂN KHẤU / CONCERT TRUSS ACROSS TOP */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-zinc-900/90 border-b border-white/20 flex items-center justify-around px-4 z-10">
          {/* Par-can light fixtures */}
          <div className="relative group/light flex flex-col items-center">
            <div className="h-2 w-3 rounded-t-xs bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          </div>
          <div className="relative group/light flex flex-col items-center">
            <div className="h-2 w-3 rounded-t-xs bg-pink-500 shadow-[0_0_8px_#ec4899] animate-pulse" />
          </div>
          {/* Centered Disco Ball */}
          <div className="relative flex flex-col items-center -mt-0.5">
            <div className="h-3 w-3 rounded-full bg-gradient-to-tr from-white via-slate-300 to-amber-200 shadow-[0_0_12px_#ffffff] border border-white/60 animate-spin" />
          </div>
          <div className="relative group/light flex flex-col items-center">
            <div className="h-2 w-3 rounded-t-xs bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
          </div>
          <div className="relative group/light flex flex-col items-center">
            <div className="h-2 w-3 rounded-t-xs bg-purple-400 shadow-[0_0_8px_#c084fc] animate-pulse" />
          </div>
        </div>

        {/* Dynamic Sweeping Spotlight Beams */}
        <div className="pointer-events-none absolute -top-4 left-1/8 w-36 h-52 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.4),_transparent_75%)] animate-stage-left" />
        <div className="pointer-events-none absolute -top-4 right-1/8 w-36 h-52 bg-[radial-gradient(ellipse_at_top,_rgba(244,63,94,0.45),_transparent_75%)] animate-stage-right" />
        <div className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 w-48 h-48 bg-[radial-gradient(ellipse_at_top,_rgba(234,179,8,0.35),_transparent_70%)] animate-stage-center" />

        {/* Dancing Cats & Live Chat Speech Bubbles */}
        <div className="relative z-10 flex flex-wrap items-end justify-center gap-2 sm:gap-5 py-1">
          {participants.map((p) => {
            const bubble = bubbles[p.clientId];
            return (
              <div
                key={p.clientId}
                className="group/cat relative flex flex-col items-center transition-all hover:scale-105 select-none"
              >
                {/* FLOATING CHAT SPEECH BUBBLE */}
                {bubble && (
                  <div className="absolute -top-11 sm:-top-13 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in zoom-in-75 slide-in-from-bottom-2 duration-200">
                    <div className="relative max-w-[125px] sm:max-w-[160px] rounded-2xl bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 px-2.5 py-1 text-[11px] font-bold shadow-xl border-2 border-rose-500/70 backdrop-blur-md">
                      <p className="line-clamp-2 break-words leading-tight text-center drop-shadow-2xs">
                        {bubble.text}
                      </p>
                      {/* Bubble Pointer Arrow */}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/95 dark:bg-zinc-900/95 border-b-2 border-r-2 border-rose-500/70 rotate-45" />
                    </div>
                  </div>
                )}

                {/* Host kick button overlay */}
                {isHost && (
                  <button
                    type="button"
                    onClick={() => void onLeaveStage(p.clientId)}
                    className="absolute -top-2 -right-2 z-30 hidden group-hover/cat:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-md hover:bg-destructive/80 transition-all cursor-pointer"
                    title="Mời xuống sân khấu"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {/* Dancing Cat GIF */}
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 drop-shadow-[0_10px_10px_rgba(0,0,0,0.7)] flex items-end justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.catGifUrl}
                    alt={p.catName || "Dancing Cat"}
                    className="h-full w-full object-contain pointer-events-none select-none"
                    loading="eager"
                  />
                </div>

                {/* Glowing Floor Pedestal */}
                <div className="h-1.5 w-14 sm:w-18 rounded-full bg-rose-500/40 blur-2xs -mt-0.5 mb-1" />

                {/* Dancer Tag with Avatar & Name */}
                <div className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-background/95 px-2 py-0.5 text-[10px] font-semibold shadow-md backdrop-blur-md max-w-[110px] sm:max-w-[135px]">
                  <Avatar className="h-3 w-3 shrink-0">
                    {p.image ? (
                      <AvatarImage src={p.image} alt={p.name} />
                    ) : (
                      <AvatarFallback className="text-[7px] bg-rose-600 text-white font-bold">
                        {p.name.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="truncate text-foreground/90">{p.name}</span>
                  {p.isHost && (
                    <span title="Chủ phòng">
                      <Crown className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Quick Click-to-Join Empty Spots if available */}
          {!isOnStage && !isFull && (
            <button
              type="button"
              onClick={handleJoinClick}
              className="flex flex-col items-center justify-center h-22 w-20 sm:h-26 sm:w-24 rounded-2xl border-2 border-dashed border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/15 hover:border-rose-500/70 transition-all p-1.5 text-center group/slot cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500/20 text-rose-500 group-hover/slot:scale-110 group-hover/slot:bg-rose-500 group-hover/slot:text-white transition-all shadow-sm">
                <Plus className="h-4 w-4" />
              </div>
              <span className="mt-1.5 text-[10px] font-bold text-rose-400 group-hover/slot:text-rose-300">
                + Lên sàn
              </span>
              <span className="text-[8px] text-muted-foreground">Nhảy cùng</span>
            </button>
          )}
        </div>

        {/* Floor Uplights & Stage Edge Platform */}
        <div className="relative z-10 mt-1.5 flex flex-col gap-1 w-full">
          {/* Mini Floor Uplight Bulbs */}
          <div className="flex justify-around items-center px-6">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <span className="h-1.5 w-1.5 rounded-full bg-pink-500 shadow-[0_0_6px_#ec4899]" />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
          </div>

          {/* Neon Floor Plank */}
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-rose-600 via-amber-400 to-rose-600 shadow-md shadow-rose-500/40 border-t border-white/30" />
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
              Chọn một bé mèo nhảy từ bộ sưu tập GIPHY Cat Dance để đại diện cho bạn trên sàn nhảy!
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
                      : "border-border/60 bg-card/60 hover:border-border hover:bg-muted/40"
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
                Chỉnh số lượng người tối đa và duyệt yêu cầu lên sân khấu của các thành viên.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Cài đặt sức chứa sân khấu */}
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 p-3">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Số lượng tối đa trên sân khấu</h4>
                  <p className="text-[11px] text-muted-foreground">Từ 1 đến 12 người cùng nhảy</p>
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
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
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
                              <span className="font-medium text-foreground/80">{r.catName}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
                            onClick={() => void onApproveRequest(r.clientId)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Duyệt
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => void onRejectRequest(r.clientId)}
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
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
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
                          <span className="font-semibold truncate">{p.name}</span>
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
                <span className="text-xs text-muted-foreground">Tắt sân khấu để ẩn khỏi phòng:</span>
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
