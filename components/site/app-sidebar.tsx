"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCOUNT_NAV, LIBRARY_NAV, PRIMARY_NAV, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "xemphim:sidebar:collapsed";

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
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const { href, label, icon: Icon } = item;
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
        collapsed && "justify-center px-0",
        active
          ? "bg-gradient-to-r from-rose-500/20 via-purple-500/10 to-transparent font-semibold text-foreground border-l-2 border-rose-500 shadow-sm shadow-rose-500/10"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground hover:translate-x-0.5",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-rose-500" : "group-hover:text-foreground",
        )}
      />
      {collapsed ? null : <span className="truncate">{label}</span>}
      {active && !collapsed && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
      )}
    </Link>
  );
}

function SectionLabel({ children, hidden }: { children: React.ReactNode; hidden: boolean }) {
  if (hidden) return <div className="my-2 h-px bg-white/10" />;
  return (
    <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">
      {children}
    </p>
  );
}

/**
 * Desktop navigation rail (lg+ only).
 */
export function AppSidebar() {
  const { collapsed, toggle } = useCollapsed();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab");

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.includes("?tab=")) {
      const [path, query] = href.split("?tab=");
      return pathname === path && currentTab === query;
    }
    if (href === "/favorites") {
      return pathname === "/favorites" && !currentTab;
    }
    if (href === "/account") {
      return pathname === "/account" && !currentTab;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "sticky top-24 hidden shrink-0 self-start lg:block transition-all duration-300",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      <div className="rounded-2xl border border-white/10 bg-card/75 p-2 shadow-2xl backdrop-blur-2xl">
        <div className={cn("flex pb-1", collapsed ? "justify-center" : "justify-end")}>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={toggle}
            aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            className="h-8 w-8 text-muted-foreground hover:bg-white/10 hover:text-foreground rounded-lg"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}

          <SectionLabel hidden={collapsed}>Thư viện</SectionLabel>
          {LIBRARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}

          <SectionLabel hidden={collapsed}>Khác</SectionLabel>
          {ACCOUNT_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}
