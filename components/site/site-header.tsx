"use client";

import Link from "next/link";
import { Command, Heart, History, LogIn, Settings, Sparkles, User, UserPlus, Users } from "lucide-react";
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

export function SiteHeader() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const initial = (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase();

  const openCommandPalette = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
    );
  };

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="container max-w-7xl mx-auto">
        <div className="relative flex h-16 items-center justify-between gap-2 rounded-2xl border border-white/10 bg-card/75 px-3.5 shadow-2xl backdrop-blur-2xl sm:gap-4 sm:px-5">
          {/* Brand Logo */}
          <Link href="/" aria-label="Về trang chủ XemPhim" className="min-w-0 shrink-0">
            <Wordmark hideTextOnMobile />
          </Link>

          {/* Centered Large Search Bar */}
          <HeaderSearch />

          {/* Global Controls & Account */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={openCommandPalette}
              aria-label="Mở bảng lệnh (Ctrl+K)"
              title="Mở bảng lệnh (Ctrl+K)"
              className="hidden h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs text-muted-foreground transition hover:border-white/20 hover:bg-white/10 hover:text-foreground sm:inline-flex"
            >
              <Command className="h-3.5 w-3.5" />
              <kbd className="font-mono text-[10px] text-muted-foreground/80">Ctrl K</kbd>
            </button>

            {/* Quick Watch Party button */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-white/10 bg-white/5 px-2.5 sm:px-3 text-muted-foreground hover:border-purple-500/40 hover:bg-purple-500/10 hover:text-purple-400"
              title="Phòng xem chung"
            >
              <Link href="/rooms" className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
                </span>
                <Users className="h-4 w-4" />
                <span className="hidden xl:inline text-xs font-semibold">Xem chung</span>
              </Link>
            </Button>

            <ThemeToggle />

            {status === "loading" ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-white/10 sm:w-20" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative rounded-full ring-2 ring-white/15 transition hover:ring-rose-500/50 focus:outline-none"
                    aria-label="Menu người dùng"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                      <AvatarFallback className="bg-gradient-to-br from-rose-500 to-purple-600 text-xs font-bold text-white">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-strong border-white/10 p-1.5">
                  <DropdownMenuLabel className="px-2 py-1.5">
                    <div className="text-sm font-bold text-foreground">{user.name ?? "Người dùng"}</div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/account" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-rose-400" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/favorites" className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-purple-400" />
                      <span>Yêu thích & Bộ sưu tập</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/history" className="flex items-center gap-2">
                      <History className="h-4 w-4 text-cyan-400" />
                      <span>Lịch sử xem</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                    <Link href="/account?tab=settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>Cài đặt & Sở thích</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <div className="p-1">
                    <SignOutButton />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button asChild variant="ghost" size="sm" className="hidden rounded-xl text-muted-foreground hover:text-foreground sm:inline-flex">
                  <Link href="/login">
                    <LogIn className="mr-1.5 h-3.5 w-3.5" /> Đăng nhập
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 font-semibold text-white shadow-[0_0_20px_rgba(255,42,84,0.4)] hover:brightness-110"
                >
                  <Link href="/register">
                    <UserPlus className="mr-1.5 hidden sm:inline h-3.5 w-3.5" /> Đăng ký
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
