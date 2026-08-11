"use client";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Glass } from "@/components/ui/glass";
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
import { Wordmark } from "./logo";

/**
 * Header is deliberately navigation-free: primary links live in the sidebar
 * (desktop) and the bottom bar (mobile), so nothing is duplicated. What stays
 * here is branding plus global controls that belong to no single page.
 */
export function SiteHeader() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const initial = (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="container">
        <Glass
          intensity="strong"
          className="flex h-14 items-center justify-between gap-3 px-3 sm:px-4 glow-soft"
        >
          <Link href="/" aria-label="Về trang chủ" className="min-w-0">
            <Wordmark hideTextOnMobile />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />

            {status === "loading" ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-foreground/10 sm:w-24" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full ring-1 ring-border transition hover:ring-primary/40"
                    aria-label="Menu người dùng"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/30 to-fuchsia-500/30 text-foreground">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 glass-strong">
                  <DropdownMenuLabel>
                    <div className="text-sm font-semibold">{user.name ?? "Người dùng"}</div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">Tài khoản</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <SignOutButton />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/login">
                    <LogIn className="mr-1" /> Đăng nhập
                  </Link>
                </Button>
                <Button asChild size="sm" className="glow-primary">
                  <Link href="/register">
                    <UserPlus className="mr-1 hidden sm:inline" /> Đăng ký
                  </Link>
                </Button>
              </>
            )}
          </div>
        </Glass>
      </div>
    </header>
  );
}
