"use client";
import { useTranslations } from "@/components/locale-provider";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  Link2,
  Loader2,
  Plus,
  Radio,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeRoomCode, ROOM_CODE_LENGTH } from "@/lib/rooms";
import { extractYouTubeId } from "@/lib/youtube-url";
import { useToast } from "@/hooks/use-toast";
import { DeleteRoomButton } from "./delete-room-button";

type RoomListItem = {
  code: string;
  title: string;
  videoTitle: string;
  thumbnail: string;
  messageCount: number;
  updatedAt: string;
};

export function RoomsIndex() {
  const t = useTranslations();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [roomsError, setRoomsError] = useState(false);
  const [reload, setReload] = useState(0);

  // Create room modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setLoaded(true);
      setRooms([]);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    setRoomsError(false);
    void (async () => {
      try {
        const res = await fetch("/api/rooms", { cache: "no-store" });
        if (!res.ok) throw new Error("Room list unavailable");
        const json = (await res.json()) as { items?: RoomListItem[] };
        if (!cancelled) setRooms(json.items ?? []);
      } catch {
        if (!cancelled) setRoomsError(true);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, reload]);

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeRoomCode(code);
    if (normalized.length < 4) return;
    router.push("/rooms/" + normalized);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      router.push("/login?callbackUrl=/rooms");
      return;
    }

    const videoId = extractYouTubeId(videoInput.trim());
    if (!videoId) {
      toast({
        variant: "destructive",
        title: t("Link YouTube không hợp lệ"),
        description: t("Vui lòng nhập link YouTube hoặc mã video 11 ký tự."),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: roomTitle.trim() || t("Phòng xem chung"),
          video: {
            videoId,
            title: `YouTube · ${videoId}`,
            channel: "",
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            embedUrl: `https://www.youtube.com/embed/${videoId}`,
            watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
            duration: 0,
          },
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(err.message ?? t("Không thể tạo phòng"));
      }

      const json = (await res.json()) as { code: string };
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
      }
      toast({
        title: t("Tạo phòng thành công!"),
        description: t("Mã phòng của bạn: {p0}", { p0: json.code }),
      });
      setCreateModalOpen(false);
      router.push(`/rooms/${json.code}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("Lỗi tạo phòng"),
        description:
          err instanceof Error ? t(err.message) : t("Đã có lỗi xảy ra"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in-up">
      {/* A clear starting point for creating or joining a room. */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Radio className="h-3 w-3" />
              {t("Phòng xem chung")}{" "}
            </span>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t("Cùng xem, cùng trò chuyện")}{" "}
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground leading-relaxed">
              {t(
                "Tạo phòng riêng hoặc chia sẻ mã phòng để cùng nhau xem video YouTube đồng bộ từng giây và trò chuyện trực tiếp.",
              )}{" "}
            </p>
          </div>

          <Button
            onClick={() => {
              if (status !== "authenticated") {
                router.push("/login?callbackUrl=/rooms");
              } else {
                setCreateModalOpen(true);
              }
            }}
            size="lg"
            className="gap-2 self-start rounded-xl font-semibold sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>{t("Tạo phòng mới")}</span>
          </Button>
        </div>
      </div>

      {/* Grid: Join with code + How it works */}
      <div className="grid gap-6 md:grid-cols-12">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 md:col-span-7">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-bold text-foreground">
              {t("Tham gia bằng mã phòng")}
            </h2>
          </div>

          <form onSubmit={join} className="flex flex-col sm:flex-row gap-2.5">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={
                t("Nhập mã phòng (") + "A".repeat(ROOM_CODE_LENGTH) + ")"
              }
              aria-label={t("Tham gia bằng mã phòng")}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={ROOM_CODE_LENGTH}
              className="h-12 rounded-xl border-border bg-background text-center font-mono uppercase tracking-[0.25em] sm:text-left"
            />
            <Button
              type="submit"
              size="lg"
              disabled={code.trim().length < 4}
              className="shrink-0 gap-2 rounded-xl font-semibold"
            >
              <span>{t("Vào phòng")}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            {t(
              "Bất kỳ ai có mã phòng đều có thể tham gia xem trực tiếp. Đăng nhập để cùng thảo luận và gửi biểu cảm.",
            )}{" "}
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-6 md:col-span-5">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Sparkles className="h-4 w-4" />
            <span>{t("Đồng bộ phát video thông minh")}</span>
          </div>
          <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <li>
              {t(
                "• Khi chủ phòng tạm dừng, tua hoặc đổi video, tất cả thành viên trong phòng đều được đồng bộ tự động.",
              )}
            </li>
            <li>
              {t(
                "• Hỗ trợ trò chuyện văn bản và thả phản ứng emoji trực tiếp.",
              )}
            </li>
            <li>
              {t(
                "Mời bạn bè bằng mã phòng hoặc liên kết. Video tiếp tục khi mạng tạm gián đoạn.",
              )}
            </li>
          </ul>
        </div>
      </div>

      {/* My Created Rooms Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="font-display text-base font-bold text-foreground">
            {t("Phòng của bạn")}
          </h2>
          <span className="text-xs font-semibold text-muted-foreground">
            {rooms.length} {t("phòng")}
          </span>
        </div>

        {status === "loading" ? (
          <p role="status" className="py-8 text-sm text-muted-foreground">
            {t("Đang tải danh sách phòng...")}
          </p>
        ) : status !== "authenticated" ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            <p>
              <Link
                href="/login?callbackUrl=/rooms"
                className="font-bold text-primary hover:underline"
              >
                {t("Đăng nhập")}{" "}
              </Link>{" "}
              {t("để tạo và quản lý phòng xem chung của riêng bạn.")}{" "}
            </p>
          </div>
        ) : !loaded ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{t("Đang tải danh sách phòng...")}</span>
          </div>
        ) : roomsError ? (
          <div
            role="alert"
            className="space-y-3 rounded-2xl border border-border bg-card p-8 text-center"
          >
            <p className="text-sm text-muted-foreground">
              {t("Không tải được danh sách phòng. Hãy thử lại.")}
            </p>
            <Button
              variant="outline"
              onClick={() => setReload((value) => value + 1)}
            >
              {t("Thử lại")}
            </Button>
          </div>
        ) : rooms.length === 0 ? (
          <div className="space-y-2 rounded-2xl border border-border bg-card p-10 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="font-display font-bold text-foreground">
              {t("Bạn chưa tạo phòng nào.")}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {t("Nhấn nút")} <strong>{t("Tạo phòng mới")}</strong>{" "}
              {t("ở trên hoặc chọn nút")} <strong>{t("Xem cùng")}</strong>{" "}
              {t("trên thẻ video bất kỳ.")}{" "}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <div
                key={r.code}
                className="min-w-0 rounded-2xl border bg-card p-3"
              >
                <Link
                  href={"/rooms/" + r.code}
                  className="group flex min-w-0 gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {r.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.thumbnail}
                      alt=""
                      className="aspect-video w-24 shrink-0 rounded-xl object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="aspect-video w-24 shrink-0 rounded-xl bg-muted flex items-center justify-center text-xs">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                        <Radio className="h-2.5 w-2.5 " />
                        <span>{r.code}</span>
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors mt-1.5">
                        {r.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {r.videoTitle}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {r.messageCount} {t("tin nhắn")}{" "}
                    </p>
                  </div>
                </Link>
                <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {t("Mã")} {r.code}
                  </span>
                  <DeleteRoomButton
                    code={r.code}
                    title={r.title}
                    onDeleted={() =>
                      setRooms((previous) =>
                        previous.filter((item) => item.code !== r.code),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create Room Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              {t("Tạo phòng xem chung")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t(
                "Nhập tên phòng và dán link YouTube để bắt đầu xem cùng bạn bè theo thời gian thực.",
              )}{" "}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRoom} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="create-room-title"
                className="text-sm font-medium text-foreground"
              >
                {t("Tên phòng")}
              </label>
              <Input
                id="create-room-title"
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                placeholder={t("VD: Xem phim cuối tuần, Chill cùng tôi...")}
                maxLength={60}
                className="h-11 rounded-xl border-border bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="create-room-video"
                className="text-sm font-medium text-foreground"
              >
                {t("Link YouTube hoặc ID video")}{" "}
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="create-room-video"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                  className="h-11 rounded-xl border-border bg-background pl-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl"
              >
                {t("Hủy")}{" "}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !videoInput.trim()}
                className="rounded-xl font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />{" "}
                    {t("Đang tạo...")}{" "}
                  </>
                ) : (
                  t("Tạo phòng ngay")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
