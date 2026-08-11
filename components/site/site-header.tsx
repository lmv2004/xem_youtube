"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, History, Link2, LogIn, Search, UserPlus } from "lucide-react";
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
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Khám phá", icon: Compass },
  { href: "/watch", label: "Xem nhanh", icon: Link2 },
  { href: "/favorites", label: "Yêu thích", icon: Heart },
  { href: "/history", label: "Lịch sử", icon: History },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user;
  const initial = (user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-3 z-40 px-4">
      <div className="container">
        <Glass intensity="strong" className="flex h-14 items-center justify-between gap-4 px-4 glow-soft">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <Logo size={26} />
            <span className="hidden sm:inline">XemPhimYouTube</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all",
                    active
                      ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
                      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {status === "loading" ? (
              <div className="h-9 w-24 animate-pulse rounded-full bg-foreground/10" />
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
                  <DropdownMenuItem asChild>
                    <Link href="/favorites">Danh sách yêu thích</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/history">Lịch sử xem</Link>
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
                    <UserPlus className="mr-1" /> Đăng ký
                  </Link>
                </Button>
              </>
            )}
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="md:hidden"
              aria-label="Tìm kiếm"
            >
              <Link href="/">
                <Search />
              </Link>
            </Button>
          </div>
        </Glass>
      </div>
    </header>
  );
}
