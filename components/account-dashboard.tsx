"use client";
import { useTranslations } from "@/components/locale-provider";

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
  const t = useTranslations();
  const searchParams = useSearchParams();
  const initialTab =
    searchParams.get("tab") === "settings" ? "settings" : "profile";

  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<
    "profile" | "preferences" | "settings" | "privacy"
  >(initialTab);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [autoplay, setAutoplay] = useState(true);
  const [defaultTheater, setDefaultTheater] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(STORAGE_INTERESTS) ?? "[]",
      ) as string[];
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
        title: next ? t("Đã bật tự động phát") : t("Đã tắt tự động phát"),
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
        title: next
          ? t("Đã bật mặc định chế độ rạp chiếu")
          : t("Đã tắt chế độ rạp chiếu mặc định"),
      });
    } catch {
      /* ignore */
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm(t("Bạn có chắc muốn xóa toàn bộ lịch sử xem?"))) return;
    setIsClearing(true);
    try {
      const res = await fetch("/api/history?all=true", { method: "DELETE" });
      if (res.ok) {
        toast({ title: t("Đã xóa toàn bộ lịch sử xem") });
      } else throw new Error("History delete failed");
    } catch {
      toast({ title: t("Không thể xóa lịch sử"), variant: "destructive" });
    } finally {
      setIsClearing(false);
    }
  };

  const formatHours = (mins: number) => {
    if (mins < 60) return t("{p0} phút", { p0: mins });
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0
      ? t("{p0} giờ {p1} phút", { p0: h, p1: m })
      : t("{p0} giờ", { p0: h });
  };

  return (
    <div className="space-y-8 animate-in-up">
      {/* Account Header with Luxury Glass Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary p-0.5 shadow-sm">
              <div className="h-full w-full rounded-2xl bg-card flex items-center justify-center overflow-hidden">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
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
                  {user.name ?? t("Thành viên XemPhim")}
                </h1>
                <span className="rounded-full border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  {t("Tài khoản")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {user.email}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5  shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
            activeTab === "profile"
              ? "bg-primary text-white "
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <User className="h-3.5 w-3.5" />
          <span>{t("Hồ sơ & Thống kê")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
            activeTab === "preferences"
              ? "bg-primary text-white "
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>
            {t("Sở thích đề xuất (")}
            {selectedTopics.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
            activeTab === "settings"
              ? "bg-primary text-white "
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>{t("Giao diện & Phát lại")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("privacy")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
            activeTab === "privacy"
              ? "bg-primary text-white "
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>{t("Quyền riêng tư & Dữ liệu")}</span>
        </button>
      </div>

      {/* Tab 1: Profile & Stats */}
      {activeTab === "profile" && (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-3xl border border-border bg-card shadow-sm ">
              <CardContent className="p-5 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>{t("Tổng video đã xem")}</span>
                  <PlaySquare className="h-4 w-4 text-rose-500" />
                </div>
                <p className="font-display text-2xl sm:text-3xl font-extrabold text-foreground pt-1">
                  {stats.totalWatched}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("Video được ghi nhận trong lịch sử")}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-border bg-card shadow-sm ">
              <CardContent className="p-5 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>{t("Thời lượng video đã lưu trong lịch sử")}</span>
                  <Clock className="h-4 w-4 text-purple-400" />
                </div>
                <p className="font-display text-2xl sm:text-3xl font-extrabold text-foreground pt-1">
                  {formatHours(stats.totalMinutes)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    "Tổng thời lượng video, không phải thời gian đã xem thực tế.",
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-border bg-card shadow-sm ">
              <CardContent className="p-5 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                  <span>{t("Video xem gần nhất")}</span>
                  <Eye className="h-4 w-4 text-cyan-400" />
                </div>
                <p className="line-clamp-2 text-xs sm:text-sm font-semibold text-foreground pt-2">
                  {stats.lastSeenTitle ?? t("Chưa có lượt xem gần đây")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Channels */}
          {stats.topChannels.length > 0 && (
            <Card className="rounded-3xl border border-border bg-card p-6 shadow-sm  space-y-4">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span>{t("Kênh bạn xem nhiều nhất")}</span>
              </div>
              <div className="divide-y divide-white/10">
                {stats.topChannels.map((c, idx) => (
                  <div
                    key={c.channel}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-500/20 text-xs font-bold text-rose-400">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-foreground">
                        {c.channel}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {c.count} {t("video")}{" "}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      )}

      {/* Tab 2: Recommendation Preferences */}
      {activeTab === "preferences" && (
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-sm ">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {t("Chủ đề sở thích cá nhân")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "Chọn 3–5 chủ đề yêu thích của bạn. Trang chủ sẽ ưu tiên hiển thị các video thuộc những chủ đề này.",
              )}{" "}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {TOPIC_PRESETS.map((preset) => {
              const active = selectedTopics.includes(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => toggleTopic(preset.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
                    active
                      ? "bg-primary text-white "
                      : "border border-border bg-muted/50 text-foreground/80 hover:border-border hover:bg-muted",
                  )}
                >
                  {active ? (
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  ) : null}
                  <span>{t(preset.label)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab 3: Settings */}
      {activeTab === "settings" && (
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm ">
          {/* Theme Selector */}
          <div className="space-y-3">
            <h2 className="font-display text-base font-bold text-foreground">
              {t("Giao diện màu sắc")}
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "dark", label: t("Tối (Cosmic Dark)"), icon: Moon },
                { id: "light", label: t("Sáng (Light Mode)"), icon: Sun },
                { id: "system", label: t("Hệ thống (Auto)"), icon: Laptop },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id as Theme)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center text-xs font-semibold transition-all duration-200",
                    theme === id
                      ? "border-rose-500 bg-rose-500/10 text-rose-400 "
                      : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Autoplay & Theater options */}
          <div className="divide-y divide-border pt-2">
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t("Tự động phát khi mở video")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Bắt đầu phát khi bạn mở trang video, nếu trình duyệt cho phép.",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoplayToggle}
                role="switch"
                aria-checked={autoplay}
                aria-label={t("Tự động phát khi mở video")}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                  autoplay
                    ? "bg-rose-500 shadow-[0_0_12px_rgba(255,42,84,0.4)]"
                    : "bg-muted-foreground/40",
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
                <p className="text-sm font-semibold text-foreground">
                  {t("Mặc định chế độ rạp chiếu phim")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Mở rộng khung phát chiếm toàn màn hình trang xem")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleTheaterToggle}
                role="switch"
                aria-checked={defaultTheater}
                aria-label={t("Mặc định chế độ rạp chiếu phim")}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                  defaultTheater
                    ? "bg-rose-500 shadow-[0_0_12px_rgba(255,42,84,0.4)]"
                    : "bg-muted-foreground/40",
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
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-5 shadow-sm ">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {t("Quản lý quyền riêng tư & Dữ liệu")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "Bạn có toàn quyền kiểm soát lịch sử xem và dữ liệu cá nhân của mình.",
              )}{" "}
            </p>
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 space-y-3">
            <h3 className="font-semibold text-sm text-destructive">
              {t("Xóa toàn bộ lịch sử xem")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(
                "Thao tác này sẽ xóa vĩnh viễn danh sách tất cả các video bạn đã xem khỏi tài khoản. Hành động này không thể hoàn tác.",
              )}{" "}
            </p>
            <Button
              variant="destructive"
              size="sm"
              disabled={isClearing}
              onClick={handleClearHistory}
              className="rounded-xl gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span>
                {isClearing
                  ? t("Đang xóa...")
                  : t("Xác nhận xóa toàn bộ lịch sử")}
              </span>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
