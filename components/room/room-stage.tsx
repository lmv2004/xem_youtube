"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  Crown,
  Users,
  Settings2,
  X,
  Check,
  Plus,
  Minus,
  Trash2,
  ExternalLink,
  Loader2,
  Music4,
  Flame,
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
import { cn } from "@/lib/utils";

type RoomStageProps = {
  stage: RoomStageState;
  isHost: boolean;
  isOnStage: boolean;
  isPendingApproval: boolean;
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

  const { enabled, maxParticipants, participants, requests } = stage;

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
    <div className="relative rounded-2xl border border-rose-500/30 bg-gradient-to-b from-card/95 via-card/85 to-background/95 p-3 sm:p-4 shadow-xl backdrop-blur-xl overflow-hidden group">
      {/* Stage Ambient Glow Effect */}
      <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-36 w-3/4 rounded-full bg-gradient-to-r from-rose-500/20 via-purple-500/20 to-amber-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/4 h-24 w-1/2 rounded-full bg-rose-600/10 blur-2xl" />

      {/* Stage Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-md shadow-rose-500/30">
            <Music4 className="h-4 w-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wide text-xs sm:text-sm uppercase bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                Sân Khấu Mèo Nhảy
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>Meme mèo nhảy từ GIPHY</span>
              <span>•</span>
              <span className="font-semibold text-foreground/80">
                {participants.length}/{maxParticipants} đang quẩy
              </span>
            </p>
          </div>
        </div>

        {/* Stage Header Controls */}
        <div className="flex items-center gap-2">
          {/* User stage action button */}
          {isOnStage ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold gap-1.5 shadow-sm"
              onClick={() => void onLeaveStage()}
            >
              <span>🐾 Xuống sân khấu</span>
            </Button>
          ) : isPendingApproval ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-semibold gap-1.5"
              onClick={() => void onCancelRequest()}
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Chờ chủ phòng duyệt (Huỷ)</span>
            </Button>
          ) : isFull && !isHost ? (
            <Badge variant="outline" className="h-8 rounded-full text-xs text-muted-foreground px-3">
              Sân khấu đã đầy ({maxParticipants}/{maxParticipants})
            </Badge>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs shadow-md shadow-rose-600/30 gap-1.5 transition-all hover:scale-105"
              onClick={handleJoinClick}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Lên sân khấu 💃</span>
            </Button>
          )}

          {/* Host Management Controls */}
          {isHost && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="relative h-8 rounded-full border-border/80 bg-background/50 hover:bg-muted text-xs font-semibold gap-1.5"
              onClick={() => setManageOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Quản lý sân khấu</span>
              {requests.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {requests.length}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Sàn Nhảy / Dance Floor Deck */}
      <div className="relative mt-3 min-h-[140px] sm:min-h-[160px] rounded-xl border border-border/40 bg-gradient-to-b from-card/40 to-muted/20 p-3 flex flex-col justify-end overflow-hidden">
        {/* Stage Lighting Grid */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.15),_transparent_70%)]" />

        {participants.length === 0 ? (
          <div className="relative z-10 flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 border border-border/60 text-muted-foreground mb-2">
              <Flame className="h-6 w-6 text-rose-500/60" />
            </div>
            <p className="text-xs font-medium text-muted-foreground max-w-sm">
              Sân khấu đang mở và trống! Hãy bấm <span className="text-rose-500 font-semibold">&ldquo;Lên sân khấu 💃&rdquo;</span> để chọn meme mèo và khuấy động bầu không khí!
            </p>
          </div>
        ) : (
          <div className="relative z-10 flex flex-wrap items-end justify-center gap-4 sm:gap-6 py-2">
            {participants.map((p) => (
              <div
                key={p.clientId}
                className="group/cat relative flex flex-col items-center transition-transform hover:scale-110"
              >
                {/* Host kick button overlay */}
                {isHost && (
                  <button
                    type="button"
                    onClick={() => void onLeaveStage(p.clientId)}
                    className="absolute -top-2 -right-2 z-20 hidden group-hover/cat:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-md hover:bg-destructive/80 transition-all"
                    title="Mời xuống sân khấu"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}

                {/* Dancing Cat GIF */}
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.catGifUrl}
                    alt={p.catName || "Dancing Cat"}
                    className="h-full w-full object-contain pointer-events-none select-none"
                    loading="eager"
                  />
                </div>

                {/* Dancer Tag with Avatar & Name */}
                <div className="mt-1 flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 px-2.5 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-md max-w-[120px] sm:max-w-[140px]">
                  <Avatar className="h-3.5 w-3.5 shrink-0">
                    {p.image ? (
                      <AvatarImage src={p.image} alt={p.name} />
                    ) : (
                      <AvatarFallback className="text-[8px] bg-rose-600 text-white">
                        {p.name.slice(0, 1)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="truncate text-foreground/90">{p.name}</span>
                  {p.isHost && (
                    <span title="Chủ phòng"><Crown className="h-3 w-3 text-amber-500 shrink-0" /></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dance Floor Edge Plank */}
        <div className="relative z-10 mt-2 h-1.5 w-full rounded-full bg-gradient-to-r from-rose-500/30 via-amber-500/40 to-rose-500/30 shadow-sm" />
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
              Chọn một bé mèo nhảy từ bộ sưu tập GIPHY Cat Dance để đại diện cho bạn trên sân khấu!
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
                <span>Quản lý sân khấu mèo nhảy</span>
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
