"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Smile } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MAX_MESSAGE_LENGTH, type RoomMessageDto } from "@/lib/rooms";
import { cn } from "@/lib/utils";

type Props = {
  messages: RoomMessageDto[];
  canChat: boolean;
  currentUserId?: string | null;
  isSending: boolean;
  onSend: (body: string) => Promise<boolean>;
};

function initialOf(name: string | null) {
  return (name ?? "?").trim().slice(0, 1).toUpperCase() || "?";
}

function timeOf(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function RoomChat({
  messages,
  canChat,
  currentUserId,
  isSending,
  onSend,
}: Props) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !pinnedRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || isSending) return;
    const ok = await onSend(body);
    if (ok) {
      setDraft("");
      pinnedRef.current = true;
    }
  };

  const handleEmojiClick = async (emoji: string) => {
    if (emoji === "🎉" || emoji === "🔥" || emoji === "❤️") {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.8 },
      });
    }
    await onSend(emoji);
  };

  return (
    <div className="flex h-[440px] flex-col rounded-3xl border border-white/10 bg-card/80 shadow-2xl backdrop-blur-2xl lg:h-[580px] overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3.5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-sm font-bold text-foreground">Trò chuyện trực tiếp</h2>
          <p className="text-[11px] text-muted-foreground font-medium">
            {messages.length > 0 ? `${messages.length} tin nhắn` : "Phòng đang sẵn sàng"}
          </p>
        </div>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5"
      >
        {messages.length === 0 ? (
          <div className="pt-16 text-center space-y-1">
            <Smile className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs font-semibold text-foreground">Chưa có ai nhắn tin</p>
            <p className="text-[11px] text-muted-foreground">
              Hãy gửi tin nhắn đầu tiên để khuấy động phòng nhé!
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.author.id === currentUserId;
            return (
              <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                <Avatar className="h-7 w-7 shrink-0 ring-1 ring-white/10">
                  <AvatarImage src={m.author.image ?? ""} alt="" />
                  <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-purple-500 to-rose-500 text-white">
                    {initialOf(m.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("min-w-0 max-w-[80%]", mine && "text-right")}>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {mine ? "Bạn" : m.author.name ?? "Người dùng"} · {timeOf(m.createdAt)}
                  </p>
                  <p
                    className={cn(
                      "mt-1 inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-medium",
                      mine
                        ? "bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-md shadow-purple-500/20"
                        : "bg-white/5 border border-white/10 text-foreground",
                    )}
                  >
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Reaction Bar & Input */}
      <div className="border-t border-white/10 p-3 space-y-2.5 bg-black/20">
        {canChat ? (
          <>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-base scrollbar-none">
              {["👍", "❤️", "😂", "🔥", "🍿", "👏", "🎉", "😮"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => void handleEmojiClick(emoji)}
                  className="rounded-lg p-1.5 transition hover:bg-white/10 hover:scale-125 duration-150"
                  title={`Gửi ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Nhập tin nhắn..."
                maxLength={MAX_MESSAGE_LENGTH}
                className="h-10 rounded-xl border-white/10 bg-white/5 text-xs sm:text-sm focus:border-purple-500/50"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isSending || !draft.trim()}
                className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)] shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-1">
            <Link href="/login" className="font-bold text-rose-400 hover:underline">
              Đăng nhập
            </Link>{" "}
            để tham gia trò chuyện. Bạn vẫn xem video bình thường.
          </p>
        )}
      </div>
    </div>
  );
}
