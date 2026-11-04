"use client";
import { useTranslations } from "@/components/locale-provider";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  LogIn,
  MessageSquare,
  Send,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MAX_MESSAGE_LENGTH, type RoomMessageDto } from "@/lib/rooms";
import { createRoomOutbox, type OutboxMessage } from "@/lib/room-outbox";
import { createRoomUnreadTracker } from "@/lib/room-unread";
import { useChatAttention } from "@/hooks/use-chat-attention";
import { useChatSound } from "@/hooks/use-chat-sound";
import { cn } from "@/lib/utils";

type Props = {
  fillHeight?: boolean;
  active?: boolean;
  historyReady?: boolean;
  onUnreadChange?: (count: number) => void;
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

function isOnlyEmoji(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const regex =
    /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F|\u200D|\s){1,10}$/u;
  if (/^[0-9#*]+$/.test(trimmed)) return false;
  return regex.test(trimmed);
}

const EMOJIS = ["👍", "❤️", "😂", "🔥", "🍿", "👏", "🎉", "😮"] as const;

export function RoomChat({
  fillHeight = false,
  active = true,
  historyReady = true,
  onUnreadChange,
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
  const [atBottom, setAtBottom] = useState(true);
  const attentive = useChatAttention();
  const [inViewport, setInViewport] = useState(false);
  const [unread, setUnread] = useState(0);
  const sound = useChatSound(unread);
  const tracker = useRef(createRoomUnreadTracker());

  useEffect(() => {
    const observer = new IntersectionObserver((entries) =>
      setInViewport(entries[0]?.isIntersecting ?? false),
    );
    if (listRef.current) observer.observe(listRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const count = tracker.current.update(
      messages,
      historyReady,
      currentUserId,
      active && attentive && inViewport && atBottom,
    );
    setUnread(count);
    onUnreadChange?.(count);
  }, [
    messages,
    historyReady,
    currentUserId,
    active,
    attentive,
    inViewport,
    atBottom,
    onUnreadChange,
  ]);

  const jumpToLatest = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    pinnedRef.current = true;
    setAtBottom(true);
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el || !active || !pinnedRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pending, active]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el || !active || !el.clientHeight) return;
    const isCloseToBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    pinnedRef.current = isCloseToBottom;
    setAtBottom(isCloseToBottom);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canChat || !connectionReady) return;
    if (outboxRef.current?.enqueue(draftRef.current)) {
      updateDraft("");
      pinnedRef.current = true;
      setAtBottom(true);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    if (!canChat || !connectionReady || !outboxRef.current?.enqueue(emoji))
      return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (emoji === "🎉") {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.85 } });
      } else if (emoji === "🔥") {
        confetti({
          particleCount: 30,
          spread: 55,
          origin: { y: 0.85 },
          colors: ["#ff4500", "#ff8c00", "#ffd700", "#ff2a54"],
        });
      } else if (emoji === "❤️") {
        confetti({
          particleCount: 30,
          spread: 55,
          origin: { y: 0.85 },
          colors: ["#ff2a54", "#ff6b8b", "#ff758c", "#ffffff"],
        });
      } else if (emoji === "🍿") {
        confetti({
          particleCount: 25,
          spread: 50,
          origin: { y: 0.85 },
          colors: ["#fef08a", "#fde047", "#facc15", "#ffffff"],
        });
      }
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
    <div
      className={cn(
        "relative flex h-[min(580px,70dvh)] min-h-[380px] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-xl shadow-black/5 dark:shadow-black/25 backdrop-blur-xl lg:h-[620px]",
        fillHeight && "lg:h-full lg:min-h-0",
      )}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-card/60 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">
              {t("Trò chuyện trực tiếp")}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {messages.length > 0
                ? t("{p0} tin nhắn", { p0: messages.length })
                : t("Phòng đang sẵn sàng")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Connection badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
              connectionReady
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
            )}
            role="status"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  connectionReady ? "bg-emerald-400" : "bg-amber-400",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex rounded-full h-1.5 w-1.5",
                  connectionReady ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
            </span>
            <span className="hidden sm:inline">
              {connectionReady ? t("Đã đồng bộ") : t("Đang đồng bộ lại")}
            </span>
          </span>

          {/* Sound settings popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "relative h-8 w-8 rounded-lg transition-colors",
                  sound.enabled
                    ? "text-primary hover:bg-primary/10 hover:text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
                aria-label={t(
                  sound.enabled ? "Tắt âm báo tin nhắn" : "Bật âm báo tin nhắn",
                )}
                title={t(
                  sound.enabled ? "Tắt âm báo tin nhắn" : "Bật âm báo tin nhắn",
                )}
              >
                {sound.enabled ? (
                  sound.volume > 50 ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <Volume1 className="h-4 w-4" />
                  )
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                {sound.enabled && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-64 p-3.5 space-y-3.5 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {t("Âm báo tin nhắn")}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sound.enabled}
                  onClick={sound.toggle}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    sound.enabled ? "bg-primary" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
                      sound.enabled ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{t("Âm lượng")}</span>
                  <span className="font-mono font-medium text-foreground">
                    {sound.volume}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={sound.volume}
                  onChange={(e) => sound.changeVolume(Number(e.target.value))}
                  disabled={!sound.enabled}
                  aria-label={t("Âm lượng âm báo")}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary disabled:opacity-40"
                />
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!sound.enabled}
                onClick={sound.preview}
                className="h-8 w-full text-xs gap-1.5 rounded-lg border-border/80"
              >
                <Volume2 className="h-3.5 w-3.5" />
                {t("Nghe thử")}
              </Button>

              {sound.enabled && !sound.ready && !sound.failed && (
                <button
                  type="button"
                  onClick={sound.preview}
                  className="w-full rounded-lg bg-amber-500/10 p-2 text-left text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-colors"
                >
                  {t("Nhấn để kích hoạt âm báo")}
                </button>
              )}

              {sound.failed && (
                <p
                  role="status"
                  className="rounded-lg bg-destructive/10 p-2 text-[11px] text-destructive"
                >
                  {t("Chưa phát được âm báo. Hãy thử bật lại âm báo.")}
                </p>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={listRef}
          onScroll={onScroll}
          className="h-full space-y-1 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          role="log"
          aria-label={t("Trò chuyện trực tiếp")}
          aria-relevant="additions"
        >
          {messages.length === 0 && pending.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-transparent border border-primary/20 shadow-inner">
                <MessageSquare className="h-7 w-7 text-primary" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary"></span>
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {t("Chưa có ai nhắn tin")}
              </h3>
              <p className="mt-1 max-w-[240px] text-xs text-muted-foreground leading-relaxed">
                {t("Hãy gửi tin nhắn đầu tiên để khuấy động phòng nhé!")}
              </p>

              {canChat && connectionReady && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 max-w-[280px]">
                  {[
                    { emoji: "👋", text: "Chào mọi người!" },
                    { emoji: "🍿", text: "Bắt đầu xem thôi!" },
                    { emoji: "🔥", text: "Video này hay quá!" },
                  ].map((item) => (
                    <button
                      key={item.text}
                      type="button"
                      onClick={() => {
                        if (
                          outboxRef.current?.enqueue(
                            `${item.emoji} ${item.text}`,
                          )
                        ) {
                          pinnedRef.current = true;
                          setAtBottom(true);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-95"
                    >
                      <span>{item.emoji}</span>
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            timeline.map((m, index) => {
              const mine = m.author.id === currentUserId;
              const prev = index > 0 ? timeline[index - 1] : undefined;
              const next =
                index < timeline.length - 1 ? timeline[index + 1] : undefined;

              const isSameAuthorAsPrev = Boolean(
                prev && prev.author.id === m.author.id,
              );
              const isSameAuthorAsNext = Boolean(
                next && next.author.id === m.author.id,
              );

              const prevTime = prev ? new Date(prev.createdAt).getTime() : 0;
              const currTime = new Date(m.createdAt).getTime();
              const nextTime = next ? new Date(next.createdAt).getTime() : 0;

              const isCloseToPrev =
                isSameAuthorAsPrev && Math.abs(currTime - prevTime) < 90_000;
              const isCloseToNext =
                isSameAuthorAsNext && Math.abs(nextTime - currTime) < 90_000;

              const isFirstInGroup = !isCloseToPrev;
              const isLastInGroup = !isCloseToNext;
              const isEmojiOnly = isOnlyEmoji(m.body);

              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex gap-2.5 items-start",
                    mine ? "justify-end" : "justify-start",
                    isFirstInGroup ? "pt-2.5 first:pt-0" : "pt-0.5",
                  )}
                >
                  {/* Avatar for other authors: rendered on isFirstInGroup at the top */}
                  {!mine && (
                    <div className="w-7 shrink-0">
                      {isFirstInGroup ? (
                        <Avatar className="h-7 w-7 ring-1 ring-border shadow-xs">
                          <AvatarImage src={m.author.image ?? ""} alt="" />
                          <AvatarFallback className="bg-gradient-to-br from-primary/15 to-accent/15 text-xs font-semibold text-foreground">
                            {initialOf(m.author.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-7 h-7" aria-hidden="true" />
                      )}
                    </div>
                  )}

                  {/* Bubble Content */}
                  <div
                    className={cn(
                      "min-w-0 max-w-[78%] sm:max-w-[82%]",
                      mine && "flex flex-col items-end",
                    )}
                  >
                    {/* Author Name for first message in group of others */}
                    {!mine && isFirstInGroup && (
                      <p className="mb-1 text-[11px] font-medium text-muted-foreground/80 pl-1 truncate leading-none">
                        {m.author.name ?? t("Người dùng")}
                      </p>
                    )}

                    {isEmojiOnly ? (
                      <div className="py-0.5 select-none text-3xl sm:text-4xl filter drop-shadow-xs animate-in zoom-in-75 duration-150 leading-tight">
                        {m.body}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "group relative px-3.5 py-2 text-sm leading-relaxed [overflow-wrap:anywhere] transition-all",
                          mine
                            ? "bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-sm shadow-primary/20"
                            : "bg-muted/75 hover:bg-muted text-foreground border border-border/50 shadow-xs",
                          // Corner radius morphing based on position in group
                          isFirstInGroup &&
                            isLastInGroup &&
                            (mine
                              ? "rounded-2xl rounded-tr-xs"
                              : "rounded-2xl rounded-tl-xs"),
                          isFirstInGroup &&
                            !isLastInGroup &&
                            (mine
                              ? "rounded-2xl rounded-tr-xs rounded-br-sm"
                              : "rounded-2xl rounded-tl-xs rounded-bl-sm"),
                          !isFirstInGroup &&
                            !isLastInGroup &&
                            (mine
                              ? "rounded-2xl rounded-r-sm"
                              : "rounded-2xl rounded-l-sm"),
                          !isFirstInGroup &&
                            isLastInGroup &&
                            (mine
                              ? "rounded-2xl rounded-r-sm rounded-br-xl"
                              : "rounded-2xl rounded-l-sm rounded-bl-xl"),
                        )}
                      >
                        <span className="whitespace-pre-wrap">{m.body}</span>
                        <div
                          className={cn(
                            "mt-0.5 flex items-center gap-1 text-[10px] select-none",
                            mine
                              ? "justify-end text-primary-foreground/75"
                              : "justify-end text-muted-foreground/70",
                          )}
                        >
                          <span>{timeOf(m.createdAt, t.locale)}</span>
                          {m.pending && (
                            <span className="inline-flex items-center">
                              {m.pending.status === "failed" ? (
                                <AlertCircle className="h-3 w-3 text-destructive-foreground" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Failed send actions */}
                    {m.pending?.status === "failed" && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>{t("Chưa xác nhận gửi thành công")}</span>
                        <button
                          type="button"
                          disabled={Boolean(draft)}
                          className="ml-1 font-medium underline hover:text-destructive/80 disabled:opacity-40"
                          onClick={() => {
                            if (draftRef.current) return;
                            const body = outboxRef.current?.restore(
                              m.pending!.id,
                            );
                            if (body) updateDraft(body);
                          }}
                        >
                          {t("Đưa lại vào ô soạn")}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Avatar for current user (mine): rendered on isFirstInGroup at top-right */}
                  {mine && (
                    <div className="w-7 shrink-0">
                      {isFirstInGroup ? (
                        <Avatar className="h-7 w-7 ring-1 ring-border shadow-xs">
                          <AvatarImage
                            src={m.author.image ?? currentUser?.image ?? ""}
                            alt=""
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-xs font-semibold text-primary">
                            {initialOf(
                              m.author.name ?? currentUser?.name ?? null,
                            )}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-7 h-7" aria-hidden="true" />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Floating Unread Pill */}
        {unread > 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/30 backdrop-blur-md hover:bg-primary/95 active:scale-95 transition-all animate-in fade-in zoom-in-95 duration-150"
          >
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
            <span>{t("{count} tin nhắn mới", { count: unread })}</span>
          </button>
        )}

        {/* Floating Jump to Bottom Button */}
        {!atBottom && unread === 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            aria-label={t("Cuộn xuống dưới")}
            className="absolute bottom-3 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-background/90 text-muted-foreground shadow-md backdrop-blur-md hover:bg-muted hover:text-foreground active:scale-95 transition-all animate-in fade-in"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Footer Reaction Bar & Input */}
      <div className="shrink-0 space-y-2.5 border-t border-border/70 bg-card/60 p-3 backdrop-blur-md">
        {canChat ? (
          <>
            {/* Quick Reactions Deck */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5 px-0.5 scrollbar-none">
              {EMOJIS.map((emoji) => (
                <button
                  disabled={!connectionReady || pending.length >= 20}
                  key={emoji}
                  type="button"
                  onClick={() => void handleEmojiClick(emoji)}
                  className="group relative flex h-8 w-8 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-xl bg-muted/40 hover:bg-muted text-base sm:text-lg transition-all duration-150 hover:scale-125 hover:-translate-y-0.5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                  title={t("Gửi {p0}", { p0: emoji })}
                >
                  <span className="transition-transform group-hover:scale-110 select-none">
                    {emoji}
                  </span>
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

            {/* Input Bar */}
            <form onSubmit={submit} className="relative">
              <div className="flex items-center gap-1.5 rounded-2xl border border-border/80 bg-background/90 p-1.5 shadow-xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all backdrop-blur-sm">
                <Input
                  value={draft}
                  onChange={(e) => updateDraft(e.target.value)}
                  aria-label={t("Tin nhắn")}
                  placeholder={t("Nhập tin nhắn...")}
                  maxLength={MAX_MESSAGE_LENGTH}
                  className="h-9 min-w-0 flex-1 border-0 bg-transparent px-2.5 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      submit(event);
                    }
                  }}
                />

                {draft.length > 120 && (
                  <span className="text-[10px] font-mono text-muted-foreground select-none pr-1 tabular-nums">
                    {draft.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                )}

                <Button
                  type="submit"
                  size="icon"
                  aria-label={t("Gửi tin nhắn")}
                  disabled={
                    !connectionReady || pending.length >= 20 || !draft.trim()
                  }
                  className={cn(
                    "h-9 w-9 shrink-0 rounded-xl transition-all duration-200",
                    draft.trim()
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95"
                      : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed",
                  )}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3 text-center backdrop-blur-md">
            <p className="text-xs text-muted-foreground mb-2">
              {t("Đăng nhập để gửi tin nhắn và biểu cảm cùng bạn bè.")}
            </p>
            <Button asChild size="sm" className="w-full rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-600/25 h-9">
              <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}>
                <LogIn className="mr-1.5 h-3.5 w-3.5" />
                <span>{t("Đăng nhập ngay")}</span>
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
