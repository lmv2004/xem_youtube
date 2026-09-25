"use client";

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
import { cn } from "@/lib/utils";

type RoomListItem = {
  code: string;
  title: string;
  videoTitle: string;
  thumbnail: string;
  messageCount: number;
  updatedAt: string;
};

export function RoomsIndex() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Create room modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");
  const [videoInput, setVideoInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/rooms", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { items?: RoomListItem[] };
        if (!cancelled) setRooms(json.items ?? []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

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
        title: "Link YouTube không hợp lệ",
        description: "Vui lòng nhập link YouTube hoặc mã video 11 ký tự.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: roomTitle.trim() || "Phòng xem chung",
          videoId,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Không thể tạo phòng");
      }

      const json = (await res.json()) as { code: string };
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#8B5CF6", "#FF3366", "#06B6D4"],
      });
      toast({
        title: "Tạo phòng thành công!",
        description: `Mã phòng của bạn: ${json.code}`,
      });
      setCreateModalOpen(false);
      router.push(`/rooms/${json.code}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Lỗi tạo phòng",
        description: err instanceof Error ? err.message : "Đã có lỗi xảy ra",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in-up">
      {/* Hero Banner with Neon Glow */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-purple-950/40 via-card/90 to-card/80 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-purple-600/15 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">
              <Radio className="h-3 w-3 animate-pulse text-purple-400" />
              WATCH PARTY THEATER
            </span>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              Xem chung Realtime cùng bạn bè
            </h1>
            <p className="max-w-xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Tạo phòng riêng hoặc chia sẻ mã phòng để cùng nhau xem video YouTube đồng bộ từng giây và trò chuyện trực tiếp.
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
            className="rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-rose-600 font-bold text-white shadow-[0_0_25px_rgba(139,92,246,0.45)] hover:brightness-110 gap-2 shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo phòng mới</span>
          </Button>
        </div>
      </div>

      {/* Grid: Join with code + How it works */}
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-7 space-y-4 p-6 rounded-3xl border border-white/10 bg-card/75 shadow-xl backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-purple-400" />
            <h2 className="font-display text-base font-bold text-foreground">Tham gia bằng mã phòng</h2>
          </div>

          <form onSubmit={join} className="flex flex-col sm:flex-row gap-2.5">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={"Nhập mã phòng (" + "A".repeat(ROOM_CODE_LENGTH) + ")"}
              maxLength={ROOM_CODE_LENGTH}
              className="h-12 font-mono uppercase tracking-[0.25em] text-center sm:text-left rounded-xl border-white/10 bg-white/5 focus:border-purple-500/50"
            />
            <Button
              type="submit"
              size="lg"
              disabled={code.trim().length < 4}
              className="gap-2 shrink-0 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-[0_0_15px_rgba(139,92,246,0.3)]"
            >
              <span>Vào phòng</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            Bất kỳ ai có mã phòng đều có thể tham gia xem trực tiếp. Đăng nhập để cùng thảo luận và gửi biểu cảm.
          </p>
        </div>

        <div className="md:col-span-5 rounded-3xl border border-white/10 bg-card/50 p-6 space-y-3 backdrop-blur-2xl">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
            <Sparkles className="h-4 w-4" />
            <span>Đồng bộ phát video thông minh</span>
          </div>
          <ul className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
            <li>• Khi chủ phòng tạm dừng, tua hoặc đổi video, tất cả thành viên trong phòng đều được đồng bộ tức thì.</li>
            <li>• Hỗ trợ trò chuyện văn bản và thả phản ứng emoji trực tiếp.</li>
            <li>• Hoàn toàn miễn phí, không gián đoạn, chia sẻ liên kết dễ dàng.</li>
          </ul>
        </div>
      </div>

      {/* My Created Rooms Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-display text-base font-bold text-foreground">Phòng của bạn</h2>
          <span className="text-xs font-semibold text-muted-foreground">{rooms.length} phòng</span>
        </div>

        {status !== "authenticated" ? (
          <div className="p-8 text-center text-xs sm:text-sm text-muted-foreground rounded-3xl border border-white/10 bg-card/50 backdrop-blur-2xl">
            <p>
              <Link href="/login?callbackUrl=/rooms" className="font-bold text-purple-400 hover:underline">
                Đăng nhập
              </Link>{" "}
              để tạo và quản lý phòng xem chung của riêng bạn.
            </p>
          </div>
        ) : !loaded ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
            <span>Đang tải danh sách phòng...</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="p-10 text-center rounded-3xl border border-white/10 bg-card/50 backdrop-blur-2xl space-y-2">
            <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="font-display font-bold text-foreground">Bạn chưa tạo phòng nào.</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Nhấn nút <strong>Tạo phòng mới</strong> ở trên hoặc chọn nút <strong>Xem cùng</strong> trên thẻ video bất kỳ.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <Link
                key={r.code}
                href={"/rooms/" + r.code}
                className="group flex gap-3.5 rounded-2xl border border-white/10 bg-card/65 p-3.5 transition-all duration-300 hover:border-purple-500/40 hover:bg-card/90 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
              >
                {r.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.thumbnail}
                    alt=""
                    className="aspect-video w-32 shrink-0 rounded-xl object-cover ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="aspect-video w-32 shrink-0 rounded-xl bg-black/60 flex items-center justify-center text-xs">
                    <Video className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-400">
                      <Radio className="h-2.5 w-2.5 animate-pulse" />
                      <span>{r.code}</span>
                    </div>
                    <p className="line-clamp-2 text-xs font-semibold text-foreground group-hover:text-purple-400 transition-colors mt-1.5">
                      {r.videoTitle}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {r.messageCount} tin nhắn
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Create Room Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border-white/10 bg-card/95 shadow-2xl backdrop-blur-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Tạo phòng xem chung</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Nhập tên phòng và dán link YouTube để bắt đầu xem cùng bạn bè theo thời gian thực.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRoom} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tên phòng</label>
              <Input
                value={roomTitle}
                onChange={(e) => setRoomTitle(e.target.value)}
                placeholder="VD: Xem phim cuối tuần, Chill cùng tôi..."
                maxLength={60}
                className="h-10 rounded-xl border-white/10 bg-white/5"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Link YouTube hoặc ID video
              </label>
              <div className="relative">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required
                  className="h-10 pl-9 rounded-xl border-white/10 bg-white/5"
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
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !videoInput.trim()}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Đang tạo...
                  </>
                ) : (
                  "Tạo phòng ngay"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
