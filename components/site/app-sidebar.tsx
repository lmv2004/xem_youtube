"use client";
import { useTranslations } from "@/components/locale-provider";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ACCOUNT_NAV,
  LIBRARY_NAV,
  PRIMARY_NAV,
  type NavItem,
} from "./nav-items";
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
  const t = useTranslations();
  const { href, label, icon: Icon } = item;
  return (
    <Link
      href={href}
      title={collapsed ? t(label) : undefined}
      aria-label={t(label)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200",
        collapsed && "justify-center px-0 py-2.5",
        active
          ? "bg-rose-500/10 font-semibold text-rose-500 shadow-xs"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-0.5",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active ? "text-rose-500" : "group-hover:text-foreground",
        )}
      />
      {collapsed ? null : <span className="whitespace-normal leading-5">{t(label)}</span>}
      {active && !collapsed && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
      )}
    </Link>
  );
}

function SectionLabel({
  children,
  hidden,
}: {
  children: React.ReactNode;
  hidden: boolean;
}) {
  if (hidden) return <div className="my-2 h-px bg-border/60" />;
  return (
    <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </p>
  );
}

/**
 * Desktop navigation rail (lg+ only).
 */
export function AppSidebar() {
  const t = useTranslations();
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
      return (
        pathname === "/favorites" && (!currentTab || currentTab === "favorites")
      );
    }
    if (href === "/account") {
      return pathname === "/account" && !currentTab;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      className={cn(
        "sticky top-20 hidden shrink-0 self-start lg:block transition-all duration-300",
        collapsed ? "w-[68px]" : "w-52",
      )}
    >
      <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md p-2 shadow-xs transition-colors">
        <div
          className={cn(
            "flex pb-1",
            collapsed ? "justify-center" : "justify-end",
          )}
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={toggle}
            aria-label={
              collapsed ? t("Mở rộng thanh bên") : t("Thu gọn thanh bên")
            }
            className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex flex-col gap-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}

          <SectionLabel hidden={collapsed}>{t("Thư viện")}</SectionLabel>
          {LIBRARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}

          <SectionLabel hidden={collapsed}>{t("Khác")}</SectionLabel>
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
