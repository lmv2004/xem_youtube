"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Clipboard,
  Clock,
  ExternalLink,
  Film,
  Link2,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import confetti from "canvas-confetti";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractYouTubeId } from "@/lib/youtube-url";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STORAGE_RECENT_PASTED = "xemphim:recentPasted";

type PastedVideo = {
  id: string;
  url: string;
  timestamp: number;
};

export default function QuickWatchPage() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [detectedId, setDetectedId] = useState<string | null>(null);
  const [recentPasted, setRecentPasted] = useState<PastedVideo[]>([]);
  const [isPasting, setIsPasting] = useState(false);

  // Load recent pasted videos from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_RECENT_PASTED);
      if (stored) {
        setRecentPasted(JSON.parse(stored) as PastedVideo[]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Live detection of video ID as user types or pastes
  useEffect(() => {
    const id = extractYouTubeId(value.trim());
    setDetectedId(id ?? null);
  }, [value]);

  // Global Ctrl+V listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;
      const text = e.clipboardData?.getData("text") ?? "";
      if (text) {
        setValue(text);
        const id = extractYouTubeId(text.trim());
        if (id) {
          toast({ title: "Đã nhận diện link YouTube", description: `Mã video: ${id}` });
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const saveRecent = (id: string, url: string) => {
    try {
      const filtered = recentPasted.filter((p) => p.id !== id);
      const next: PastedVideo[] = [{ id, url, timestamp: Date.now() }, ...filtered].slice(0, 8);
      setRecentPasted(next);
      localStorage.setItem(STORAGE_RECENT_PASTED, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const clearRecent = () => {
    try {
      localStorage.removeItem(STORAGE_RECENT_PASTED);
      setRecentPasted([]);
      toast({ title: "Đã xóa lịch sử dán link" });
    } catch {
      /* ignore */
    }
  };

  const handleWatch = (id: string) => {
    saveRecent(id, value.trim() || `https://www.youtube.com/watch?v=${id}`);
    router.push(`/watch/${id}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = detectedId ?? extractYouTubeId(value.trim());
    if (!id) {
      toast({
        variant: "destructive",
        title: "Link không hợp lệ",
        description: "Vui lòng dán link YouTube hợp lệ hoặc nhập mã video 11 ký tự.",
      });
      return;
    }
    handleWatch(id);
  };

  const pasteFromClipboard = async () => {
    setIsPasting(true);
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
        throw new Error("Trình duyệt không hỗ trợ đọc clipboard tự động.");
      }
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast({ title: "Clipboard trống", description: "Hãy sao chép link YouTube trước." });
        return;
      }
      setValue(text.trim());
      const id = extractYouTubeId(text.trim());
      if (id) {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.6 },
          colors: ["#FF2A54", "#8B5CF6", "#06B6D4"],
        });
        toast({ title: "Đã dán và nhận diện thành công!", description: `Mã: ${id}` });
      } else {
        toast({
          title: "Đã dán nội dung",
          description: "Vui lòng kiểm tra lại link YouTube vừa dán.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Không thể truy cập clipboard",
        description: "Trình duyệt yêu cầu cấp quyền hoặc hãy nhấn Ctrl + V để dán trực tiếp.",
      });
    } finally {
      setIsPasting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <GradientMesh />
      <SiteHeader />
      <main className="container max-w-3xl flex-1 py-10 sm:py-16 space-y-8">
        {/* Title header */}
        <div className="text-center space-y-3 animate-in-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-400">
            <Sparkles className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
            XEM NHANH SIÊU TỐC
          </span>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Dán link YouTube để xem ngay
          </h1>
          <p className="mx-auto max-w-lg text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Hỗ trợ tất cả định dạng: video tiêu chuẩn, Shorts, youtu.be hoặc chỉ mã video (11 ký tự).
          </p>
        </div>

        {/* Drop & Paste Box */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card/80 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-in-up">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />

          <form onSubmit={submit} className="space-y-4 relative">
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                inputMode="url"
                autoComplete="off"
                autoFocus
                placeholder="Dán link YouTube tại đây (Ctrl + V)..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-14 rounded-2xl border-white/10 bg-white/5 pl-11 pr-32 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/15"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {value ? (
                  <button
                    type="button"
                    onClick={() => setValue("")}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
                    title="Xóa ô nhập"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={pasteFromClipboard}
                  disabled={isPasting}
                  className="hidden sm:inline-flex h-9 gap-1.5 rounded-xl border-white/10 bg-white/5 px-3 text-xs hover:border-white/25 hover:bg-white/10"
                >
                  <Clipboard className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Dán link</span>
                </Button>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Film className="h-3.5 w-3.5 text-rose-500" />
                <span>Nhấn <strong>Enter</strong> hoặc nút <strong>Xem ngay</strong></span>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={!detectedId}
                className="w-full sm:w-auto h-12 px-7 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold shadow-[0_0_25px_rgba(255,42,84,0.4)] hover:brightness-110 gap-2"
              >
                <span>Xem ngay</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Instant Live Preview Card */}
          {detectedId && (
            <div className="mt-6 border-t border-white/10 pt-6 animate-in-up">
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 shadow-inner">
                <div className="relative aspect-video w-full sm:w-52 overflow-hidden rounded-xl bg-black shadow-lg shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://img.youtube.com/vi/${detectedId}/mqdefault.jpg`}
                    alt="Xem trước video"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-rose-500 text-white shadow-lg">
                      <Play className="h-4 w-4 fill-white pl-0.5" />
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold text-rose-400">
                    <span>Mã ID: {detectedId}</span>
                  </div>
                  <p className="font-display font-bold text-sm sm:text-base text-foreground">
                    Video đã sẵn sàng phát
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Nhấp vào nút bên dưới để mở trình phát video chuẩn rạp chiếu phim.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                    <Button
                      size="sm"
                      onClick={() => handleWatch(detectedId)}
                      className="gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Phát ngay
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/rooms?video=${detectedId}`)}
                      className="gap-1.5 rounded-xl border-white/10"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Tạo phòng xem chung
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recently Pasted Videos History */}
        {recentPasted.length > 0 && (
          <section className="space-y-4 animate-in-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-rose-500" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Video vừa dán gần đây
                </h2>
              </div>
              <button
                type="button"
                onClick={clearRecent}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-400 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa lịch sử</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {recentPasted.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(`/watch/${item.id}`)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/60 text-left transition-all duration-300 hover:border-rose-500/40 hover:bg-card/90 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black/80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${item.id}/mqdefault.jpg`}
                      alt="Recent video"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition">
                      <Play className="h-5 w-5 fill-white text-white" />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-semibold text-foreground group-hover:text-rose-400">
                      Mã: {item.id}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Nhấn để phát lại
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
