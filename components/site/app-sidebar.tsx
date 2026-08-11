"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

/**
 * Desktop navigation rail (lg+ only). On smaller screens navigation is handled
 * exclusively by <MobileNav />, so this component renders nothing there.
 */
export function AppSidebar() {
  const { collapsed, toggle } = useCollapsed();
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
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

        <nav className="flex flex-col gap-0.5">
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
