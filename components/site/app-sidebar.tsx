"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  Compass,
  Flame,
  Heart,
  History,
  Library,
  Link2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "xemphim:sidebar:collapsed";

type NavItem = { href: string; label: string; icon: typeof Compass };

const PRIMARY: NavItem[] = [
  { href: "/", label: "Khám phá", icon: Compass },
  { href: "/watch", label: "Xem nhanh", icon: Link2 },
];

const LIBRARY: NavItem[] = [
  { href: "/favorites", label: "Yêu thích", icon: Heart },
  { href: "/history", label: "Lịch sử", icon: History },
  { href: "/collections", label: "Bộ sưu tập", icon: Library },
];

const ACCOUNT: NavItem[] = [{ href: "/account", label: "Tài khoản", icon: Settings }];

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { href, label, icon: Icon } = item;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all",
        collapsed && "justify-center px-0",
        active
          ? "bg-primary/15 font-medium text-foreground ring-1 ring-primary/30"
          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
      {collapsed ? null : <span className="truncate">{label}</span>}
    </Link>
  );
}

function SectionLabel({ children, hidden }: { children: React.ReactNode; hidden: boolean }) {
  if (hidden) return <div className="my-2 h-px bg-border" />;
  return (
    <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </p>
  );
}

function SidebarBody({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="flex flex-col gap-0.5">
      {PRIMARY.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(item.href)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}

      <SectionLabel hidden={collapsed}>Thư viện</SectionLabel>
      {LIBRARY.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(item.href)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}

      <SectionLabel hidden={collapsed}>Khác</SectionLabel>
      {ACCOUNT.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(item.href)}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

/**
 * YouTube-style navigation rail.
 *
 * Desktop: a sticky column that can collapse to icons (state persisted).
 * Mobile: a hand-rolled overlay drawer — intentionally not the shared Sheet
 * component, to keep this rail independent of dialog focus-trap behaviour.
 */
export function AppSidebar() {
  const { collapsed, toggle } = useCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      {/* Mobile trigger */}
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={() => setMobileOpen(true)}
        aria-label="Mở menu điều hướng"
        className="fixed bottom-5 left-4 z-40 h-11 w-11 rounded-full shadow-lg backdrop-blur lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop rail */}
      <aside
        className={cn(
          "sticky top-24 hidden shrink-0 self-start lg:block",
          collapsed ? "w-[68px]" : "w-56",
        )}
      >
        <div className="glass rounded-2xl p-2">
          <div className={cn("flex pb-1", collapsed ? "justify-center" : "justify-end")}>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={toggle}
              aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
              className="h-8 w-8 text-muted-foreground"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>
          <SidebarBody collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 w-64 overflow-y-auto border-r border-border bg-background p-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2">
              <span className="px-2 font-display text-sm font-semibold">Điều hướng</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setMobileOpen(false)}
                aria-label="Đóng menu"
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
