"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Mobile bottom tab bar with modern glass styling and glowing active states.
 */
export function MobileNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Điều hướng chính di động"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/85 backdrop-blur-2xl lg:hidden shadow-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {MOBILE_NAV.map(({ href, label, shortLabel, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold transition-all",
                  active ? "text-rose-500" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-full transition-all duration-200",
                    active && "bg-rose-500/15 text-rose-500 shadow-[0_0_12px_rgba(255,42,84,0.3)]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="truncate leading-none">{shortLabel ?? label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
