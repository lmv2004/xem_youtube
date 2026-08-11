"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
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

  // Only auto-scroll when the reader is already at the bottom, so scrolling
  // back to re-read something is not yanked away by an incoming message.
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

  return (
    <div className="flex h-[420px] flex-col rounded-2xl border border-border bg-card lg:h-[560px]">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Trò chuyện</h2>
        <p className="text-xs text-muted-foreground">
          {messages.length > 0 ? messages.length + " tin nhắn" : "Chưa có tin nhắn nào"}
        </p>
      </div>

      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            Hãy gửi tin nhắn đầu tiên nhé.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.author.id === currentUserId;
            return (
              <div key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={m.author.image ?? ""} alt="" />
                  <AvatarFallback className="text-[11px]">
                    {initialOf(m.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("min-w-0 max-w-[80%]", mine && "text-right")}>
                  <p className="text-[11px] text-muted-foreground">
                    {mine ? "Bạn" : m.author.name ?? "Người dùng"} · {timeOf(m.createdAt)}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 inline-block whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground/5 text-foreground",
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

      <div className="border-t border-border p-3">
        {canChat ? (
          <form onSubmit={submit} className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nhập tin nhắn..."
              maxLength={MAX_MESSAGE_LENGTH}
              className="h-10"
            />
            <Button type="submit" size="icon" disabled={isSending || !draft.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Đăng nhập
            </Link>{" "}
            để tham gia trò chuyện. Bạn vẫn xem được bình thường.
          </p>
        )}
      </div>
    </div>
  );
}
