"use client";
import { useTranslations } from "@/components/locale-provider";

import Link from "next/link";
import { Heart, History, LogIn, Settings, User, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { HeaderSearch } from "./header-search";
import { Wordmark } from "./logo";
import { LanguageSelector } from "./language-selector";

export function SiteHeader({ wide = true }: { wide?: boolean }) {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const user = session?.user;
  const initial = (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65 shadow-xs transition-colors">
      <div className={wide ? "w-full px-4 sm:px-6" : "container max-w-7xl mx-auto"}>
        <div className="relative flex h-16 items-center justify-between gap-2 sm:gap-5">
          {/* Brand Logo */}
          <Link
            href="/"
            aria-label={t("Về trang chủ XemPhim")}
            className="min-w-0 shrink-0 transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Wordmark hideTextOnMobile />
          </Link>

          {/* Ô tìm kiếm toàn cục ở giữa ở desktop, nút mở rộng ở mobile */}
          <HeaderSearch />

          {/* Global Controls & Account */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Quick Watch Party Rooms CTA */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex rounded-full border-rose-500/25 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/40 gap-1.5 h-9 px-3.5 text-xs font-semibold shadow-xs transition-all hover:scale-[1.02]"
            >
              <Link href="/rooms">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <Users className="h-3.5 w-3.5" />
                <span>{t("Xem chung")}</span>
              </Link>
            </Button>

            <ThemeToggle />
            <LanguageSelector />

            {status === "loading" ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-muted sm:w-20" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative rounded-full ring-2 ring-border/80 transition hover:ring-rose-500/60 focus:outline-none"
                    aria-label={t("Menu người dùng")}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={user.image ?? ""}
                        alt={user.name ?? ""}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-rose-500 to-purple-600 text-xs font-bold text-white">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 glass-strong border-border/80 p-1.5 shadow-2xl"
                >
                  <DropdownMenuLabel className="px-2.5 py-2">
                    <div className="text-sm font-bold text-foreground">
                      {user.name ?? t("Người dùng")}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/60" />
                  <DropdownMenuItem
                    asChild
                    className="rounded-lg cursor-pointer"
                  >
                    <Link href="/account" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-rose-500" />
                      <span>{t("Hồ sơ cá nhân")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="rounded-lg cursor-pointer"
                  >
                    <Link href="/favorites" className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-purple-500" />
                      <span>{t("Yêu thích & Bộ sưu tập")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="rounded-lg cursor-pointer"
                  >
                    <Link href="/history" className="flex items-center gap-2">
                      <History className="h-4 w-4 text-cyan-500" />
                      <span>{t("Lịch sử xem")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="rounded-lg cursor-pointer"
                  >
                    <Link
                      href="/account?tab=settings"
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>{t("Cài đặt & Sở thích")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/60" />
                  <div className="p-1">
                    <SignOutButton />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-full px-3.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 text-xs font-semibold"
                >
                  <Link href="/login" className="flex items-center gap-1.5">
                    <LogIn aria-hidden="true" className="h-4 w-4" />
                    <span>{t("Đăng nhập")}</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
