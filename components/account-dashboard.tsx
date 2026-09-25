"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  Check,
  Clock,
  Eye,
  Laptop,
  Monitor,
  Moon,
  Play,
  PlaySquare,
  Shield,
  Sliders,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  User,
} from "lucide-react";
import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { TOPIC_PRESETS } from "@/components/onboarding-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Stats = {
  totalWatched: number;
  totalMinutes: number;
  lastSeenDate: string | null;
  lastSeenTitle: string | null;
  topChannels: { channel: string; count: number }[];
};

type UserInfo = {
  name: string | null;
  email: string | null;
  image: string | null;
};

type Props = {
  user: UserInfo;
  stats: Stats;
};

const STORAGE_INTERESTS = "xemphim:interests";
const STORAGE_AUTOPLAY = "xemphim:autoplay";
const STORAGE_THEATER = "xemphim:default_theater";

export function AccountDashboard({ user, stats }: Props) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "settings" ? "settings" : "profile";

  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "settings" | "privacy">(
    initialTab,
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [autoplay, setAutoplay] = useState(true);
  const [defaultTheater, setDefaultTheater] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_INTERESTS) ?? "[]") as string[];
      if (Array.isArray(stored)) setSelectedTopics(stored);

      const storedAutoplay = localStorage.getItem(STORAGE_AUTOPLAY);
      if (storedAutoplay !== null) setAutoplay(storedAutoplay === "1");

      const storedTheater = localStorage.getItem(STORAGE_THEATER);
      if (storedTheater !== null) setDefaultTheater(storedTheater === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) => {
      let next: string[];
      if (prev.includes(topic)) {
        next = prev.filter((t) => t !== topic);
      } else {
        next = prev.length >= 5 ? [...prev.slice(1), topic] : [...prev, topic];
      }
      try {
        localStorage.setItem(STORAGE_INTERESTS, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleAutoplayToggle = () => {
    const next = !autoplay;
    setAutoplay(next);
    try {
      localStorage.setItem(STORAGE_AUTOPLAY, next ? "1" : "0");
      toast({
        title: next ? "Đã bật tự động phát" : "Đã tắt tự động phát",
      });
    } catch {
      /* ignore */
    }
  };

  const handleTheaterToggle = () => {
    const next = !defaultTheater;
    setDefaultTheater(next);
    try {
      localStorage.setItem(STORAGE_THEATER, next ? "1" : "0");
      toast({
        title: next ? "Đã bật mặc định chế độ rạp chiếu" : "Đã tắt chế độ rạp chiếu mặc định",
      });
    } catch {
      /* ignore */
    }
  };

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      const res = await fetch("/api/history?all=true", { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Đã xóa toàn bộ lịch sử xem" });
      }
    } catch {
      toast({ title: "Không thể xóa lịch sử", variant: "destructive" });
    } finally {
      setIsClearing(false);
    }
  };

  const formatHours = (mins: number) => {
    if (mins < 60) return `${mins} phút`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
  };

  return (
    <div className="space-y-8 animate-in-up">
      {/* Account Header with Luxury Glass Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-card/90 via-card/80 to-purple-950/20 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 h-56 w-56 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 via-purple-600 to-cyan-500 p-0.5 shadow-xl">
              <div className="h-full w-full rounded-2xl bg-card flex items-center justify-center overflow-hidden">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-xl font-extrabold text-foreground">
                    {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {user.name ?? "Thành viên XemPhim"}
                </h1>
                <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                  VIP
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="shrink-0">
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-card/75 p-1.5 backdrop-blur-2xl shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
            activeTab === "profile"
              ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_0_15px_rgba(255,42,84,0.4)]"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          <User className="h-3.5 w-3.5" />
          <span>Hồ sơ & Thống kê</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
            activeTab === "preferences"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Sở thích đề xuất ({selectedTopics.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
            activeTab === "settings"
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Giao diện & Phát lại</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("privacy")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
            activeTab === "privacy"
              ? "bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5",
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Quyền riêng tư & Dữ liệu</span>
        </button>
      </div>

      {/* Tab 1: Profile & Stats */}
      {activeTab === "profile" && (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-3xl border border-white/10 bg-card/75 shadow-xl backdrop-blur-2xl">
              <CardContent className="p-5 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>Tổng video đã xem</span>
                  <PlaySquare className="h-4 w-4 text-rose-500" />
                </div>
                <p className="font-display text-2xl sm:text-3xl font-extrabold text-foreground pt-1">
                  {stats.totalWatched}
                </p>
                <p className="text-[11px] text-muted-foreground">Video được ghi nhận trong lịch sử</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-white/10 bg-card/75 shadow-xl backdrop-blur-2xl">
              <CardContent className="p-5 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>Thời lượng thưởng thức</span>
                  <Clock className="h-4 w-4 text-purple-400" />
                </div>
                <p className="font-display text-2xl sm:text-3xl font-extrabold text-foreground pt-1">
                  {formatHours(stats.totalMinutes)}
                </p>
                <p className="text-[11px] text-muted-foreground">Tổng thời gian xem trên nền tảng</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-white/10 bg-card/75 shadow-xl backdrop-blur-2xl">
              <CardContent className="p-5 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>Video xem gần nhất</span>
                  <Eye className="h-4 w-4 text-cyan-400" />
                </div>
                <p className="line-clamp-2 text-xs sm:text-sm font-semibold text-foreground pt-2">
                  {stats.lastSeenTitle ?? "Chưa có lượt xem gần đây"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Channels */}
          {stats.topChannels.length > 0 && (
            <Card className="rounded-3xl border border-white/10 bg-card/75 p-6 shadow-xl backdrop-blur-2xl space-y-4">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span>Kênh bạn xem nhiều nhất</span>
              </div>
              <div className="divide-y divide-white/10">
                {stats.topChannels.map((c, idx) => (
                  <div key={c.channel} className="flex items-center justify-between py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-400">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground">{c.channel}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{c.count} video</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      )}

      {/* Tab 2: Recommendation Preferences */}
      {activeTab === "preferences" && (
        <section className="rounded-3xl border border-white/10 bg-card/75 p-6 sm:p-8 space-y-4 shadow-xl backdrop-blur-2xl">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Chủ đề sở thích cá nhân</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chọn 3–5 chủ đề yêu thích của bạn. Trang chủ sẽ ưu tiên hiển thị các video thuộc những chủ đề này.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {TOPIC_PRESETS.map((t) => {
              const active = selectedTopics.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTopic(t.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
                    active
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                      : "border border-white/10 bg-white/5 text-foreground/80 hover:border-white/25 hover:bg-white/10",
                  )}
                >
                  {active ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : null}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab 3: Settings */}
      {activeTab === "settings" && (
        <section className="rounded-3xl border border-white/10 bg-card/75 p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-2xl">
          {/* Theme Selector */}
          <div className="space-y-3">
            <h2 className="font-display text-base font-bold text-foreground">Giao diện màu sắc</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "dark", label: "Tối (Cosmic Dark)", icon: Moon },
                { id: "light", label: "Sáng (Light Mode)", icon: Sun },
                { id: "system", label: "Hệ thống (Auto)", icon: Laptop },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id as Theme)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center text-xs font-semibold transition-all duration-200",
                    theme === id
                      ? "border-rose-500 bg-rose-500/10 text-rose-400 shadow-[0_0_15px_rgba(255,42,84,0.3)]"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Autoplay & Theater options */}
          <div className="divide-y divide-white/10 pt-2">
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Tự động phát video kế tiếp</p>
                <p className="text-xs text-muted-foreground">Tự chuyển sang video liên quan khi xem xong</p>
              </div>
              <button
                type="button"
                onClick={handleAutoplayToggle}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                  autoplay ? "bg-rose-500 shadow-[0_0_12px_rgba(255,42,84,0.4)]" : "bg-white/20",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200",
                    autoplay ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Mặc định chế độ rạp chiếu phim</p>
                <p className="text-xs text-muted-foreground">Mở rộng khung phát chiếm toàn màn hình trang xem</p>
              </div>
              <button
                type="button"
                onClick={handleTheaterToggle}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                  defaultTheater ? "bg-rose-500 shadow-[0_0_12px_rgba(255,42,84,0.4)]" : "bg-white/20",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200",
                    defaultTheater ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Tab 4: Privacy */}
      {activeTab === "privacy" && (
        <section className="rounded-3xl border border-white/10 bg-card/75 p-6 sm:p-8 space-y-5 shadow-xl backdrop-blur-2xl">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Quản lý quyền riêng tư & Dữ liệu</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bạn có toàn quyền kiểm soát lịch sử xem và dữ liệu cá nhân của mình.
            </p>
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 space-y-3">
            <h3 className="font-semibold text-sm text-destructive">Xóa toàn bộ lịch sử xem</h3>
            <p className="text-xs text-muted-foreground">
              Thao tác này sẽ xóa vĩnh viễn danh sách tất cả các video bạn đã xem khỏi tài khoản. Hành động này không thể hoàn tác.
            </p>
            <Button
              variant="destructive"
              size="sm"
              disabled={isClearing}
              onClick={handleClearHistory}
              className="rounded-xl gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isClearing ? "Đang xóa..." : "Xác nhận xóa toàn bộ lịch sử"}</span>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
