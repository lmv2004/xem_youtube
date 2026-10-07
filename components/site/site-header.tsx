"use client";
import { useTranslations } from "@/components/locale-provider";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, History, LogIn, Settings, User } from "lucide-react";
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

export function SiteHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user;
  const initial = (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container max-w-7xl mx-auto">
        <div className="relative flex h-16 items-center justify-between gap-2 sm:gap-5">
          {/* Brand Logo */}
          <Link
            href="/"
            aria-label={t("Về trang chủ XemPhim")}
            className="min-w-0 shrink-0"
          >
            <Wordmark hideTextOnMobile />
          </Link>

          {/* Centered Large Search Bar */}
          {pathname === "/" ? <div className="flex-1" /> : <HeaderSearch />}

          {/* Global Controls & Account */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <ThemeToggle />
            <LanguageSelector />

            {status === "loading" ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-muted sm:w-20" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative rounded-full ring-2 ring-border transition hover:ring-rose-500/50 focus:outline-none"
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
                  className="w-56 glass-strong border-border p-1.5"
                >
                  <DropdownMenuLabel className="px-2 py-1.5">
                    <div className="text-sm font-bold text-foreground">
                      {user.name ?? t("Người dùng")}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-muted" />
                  <DropdownMenuItem
                    asChild
                    className="rounded-lg cursor-pointer"
                  >
                    <Link href="/account" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-rose-400" />
                      <span>{t("Hồ sơ cá nhân")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="rounded-lg cursor-pointer"
                  >
                    <Link href="/favorites" className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-purple-400" />
                      <span>{t("Yêu thích & Bộ sưu tập")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="rounded-lg cursor-pointer"
                  >
                    <Link href="/history" className="flex items-center gap-2">
                      <History className="h-4 w-4 text-cyan-400" />
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
                  <DropdownMenuSeparator className="bg-muted" />
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
                  className="rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <Link href="/login">
                    <LogIn className="mr-1.5 h-3.5 w-3.5" />{" "}
                    {t("Đăng nhập")}{" "}
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
