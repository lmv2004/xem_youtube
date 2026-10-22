"use client";
import { useTranslations } from "@/components/locale-provider";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Send, Smile } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MAX_MESSAGE_LENGTH, type RoomMessageDto } from "@/lib/rooms";
import { createRoomOutbox, type OutboxMessage } from "@/lib/room-outbox";
import { cn } from "@/lib/utils";

type Props = {
  messages: RoomMessageDto[];
  canChat: boolean;
  connectionReady?: boolean;
  currentUserId?: string | null;
  currentUser?: { name?: string | null; image?: string | null };
  onSend: (body: string, messageId: string) => Promise<boolean>;
};

function initialOf(name: string | null) {
  return (name ?? "?").trim().slice(0, 1).toUpperCase() || "?";
}

function timeOf(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function RoomChat({
  messages,
  canChat,
  connectionReady = true,
  currentUserId,
  currentUser,
  onSend,
}: Props) {
  const t = useTranslations();
  const pathname = usePathname();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<OutboxMessage[]>([]);
  const draftRef = useRef("");
  const sendRef = useRef(onSend);
  sendRef.current = onSend;
  const outboxRef = useRef<ReturnType<typeof createRoomOutbox> | null>(null);
  useEffect(() => {
    const outbox = createRoomOutbox(
      (body, messageId) => sendRef.current(body, messageId),
      setPending,
    );
    outboxRef.current = outbox;
    return () => {
      outbox.stop();
      outboxRef.current = null;
    };
  }, []);
  useEffect(() => {
    outboxRef.current?.acknowledge(new Set(messages.map((m) => m.id)));
  }, [messages]);
  const updateDraft = (value: string) => {
    draftRef.current = value;
    setDraft(value);
  };
  const listRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (!el || !pinnedRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canChat || !connectionReady) return;
    if (outboxRef.current?.enqueue(draftRef.current)) {
      updateDraft("");
      pinnedRef.current = true;
    }
  };

  const handleEmojiClick = (emoji: string) => {
    if (!canChat || !connectionReady || !outboxRef.current?.enqueue(emoji))
      return;
    if (
      (emoji === "🎉" || emoji === "🔥" || emoji === "❤️") &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.8 },
      });
    }
  };

  const timeline = useMemo(() => {
    const confirmed = new Set(messages.map((message) => message.id));
    const items: (RoomMessageDto & { pending?: OutboxMessage })[] = [
      ...messages,
      ...pending
        .filter((message) => !confirmed.has(message.messageId))
        .map((message) => ({
          id: message.messageId,
          body: message.body,
          createdAt: message.createdAt,
          author: {
            id: currentUserId ?? "",
            name: currentUser?.name ?? null,
            image: currentUser?.image ?? null,
          },
          pending: message,
        })),
    ];
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [messages, pending, currentUserId, currentUser?.name, currentUser?.image]);
  return (
    <div className="flex h-[min(580px,70dvh)] min-h-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-card lg:h-[620px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("Trò chuyện trực tiếp")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {messages.length > 0
              ? t("{p0} tin nhắn", { p0: messages.length })
              : t("Phòng đang sẵn sàng")}
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          role="status"
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              connectionReady ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          {connectionReady ? t("Đã đồng bộ") : t("Đang đồng bộ lại")}
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={listRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
        role="log"
        aria-label={t("Trò chuyện trực tiếp")}
        aria-relevant="additions"
      >
        {messages.length === 0 && pending.length === 0 ? (
          <div className="pt-16 text-center space-y-1">
            <Smile className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="text-xs font-semibold text-foreground">
              {t("Chưa có ai nhắn tin")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Hãy gửi tin nhắn đầu tiên để khuấy động phòng nhé!")}{" "}
            </p>
          </div>
        ) : (
          timeline.map((m) => {
            const mine = m.author.id === currentUserId;
            return (
              <div
                key={m.id}
                className={cn("flex gap-2.5", mine && "flex-row-reverse")}
              >
                <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border">
                  <AvatarImage src={m.author.image ?? ""} alt="" />
                  <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                    {initialOf(m.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn("min-w-0 max-w-[80%]", mine && "text-right")}
                >
                  <p className="text-xs text-muted-foreground">
                    {mine ? t("Bạn") : (m.author.name ?? t("Người dùng"))} ·{" "}
                    {timeOf(m.createdAt, t.locale)}
                  </p>
                  <p
                    className={cn(
                      "mt-1 inline-block max-w-full whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed [overflow-wrap:anywhere]",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {m.body}
                  </p>
                  {m.pending && (
                    <p
                      role="status"
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      {m.pending.status === "failed"
                        ? t("Chưa xác nhận gửi thành công")
                        : t("Đang gửi…")}
                    </p>
                  )}
                  {m.pending?.status === "failed" && (
                    <button
                      type="button"
                      disabled={Boolean(draft)}
                      className="mt-1 text-xs text-primary underline disabled:opacity-40"
                      onClick={() => {
                        if (draftRef.current) return;
                        const body = outboxRef.current?.restore(m.pending!.id);
                        if (body) updateDraft(body);
                      }}
                    >
                      {t("Đưa lại vào ô soạn")}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Reaction Bar & Input */}
      <div className="space-y-2 border-t border-border bg-card p-3">
        {canChat ? (
          <>
            <div className="flex items-center gap-1 overflow-x-auto text-base">
              {["👍", "❤️", "😂", "🔥", "🍿", "👏", "🎉", "😮"].map((emoji) => (
                <button
                  disabled={!connectionReady || pending.length >= 20}
                  key={emoji}
                  type="button"
                  onClick={() => void handleEmojiClick(emoji)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                  title={t("Gửi {p0}", { p0: emoji })}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {pending.length >= 20 && (
              <p role="status" className="text-xs text-muted-foreground">
                {t(
                  "Hàng đợi đã đầy. Hãy chờ gửi xong hoặc xử lý tin chưa gửi.",
                )}
              </p>
            )}
            <form onSubmit={submit} className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(e) => updateDraft(e.target.value)}
                aria-label={t("Tin nhắn")}
                placeholder={t("Nhập tin nhắn...")}
                maxLength={MAX_MESSAGE_LENGTH}
                className="h-11 min-w-0 flex-1 rounded-xl border-border bg-background text-sm"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && event.nativeEvent.isComposing)
                    event.preventDefault();
                }}
              />
              <Button
                type="submit"
                size="icon"
                aria-label={t("Gửi tin nhắn")}
                disabled={
                  !connectionReady || pending.length >= 20 || !draft.trim()
                }
                className="h-11 w-11 shrink-0 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-1">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
              className="font-semibold text-primary hover:underline"
            >
              {t("Đăng nhập")}{" "}
            </Link>{" "}
            {t("để tham gia trò chuyện. Bạn vẫn xem video bình thường.")}{" "}
          </p>
        )}
      </div>
    </div>
  );
}
