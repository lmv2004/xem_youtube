"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CornerDownLeft,
  Search,
  Clock,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PRIMARY_NAV,
  LIBRARY_NAV,
  ACCOUNT_NAV,
  type NavItem,
} from "@/components/site/nav-items";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { cn } from "@/lib/utils";

type Item =
  | { kind: "nav"; id: string; item: NavItem; run: () => void }
  | { kind: "search"; id: string; term: string; run: () => void };

/**
 * Global command palette opened with Ctrl+K / Cmd+K.
 * Keyboard: ↑/↓ chọn, Enter chạy, Esc đóng. Lọc theo chuỗi đang gõ.
 */
export function CommandPalette() {
  const router = useRouter();
  const recent = useRecentSearches();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActive(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => setOpen(false);

  const navItems: Item[] = useMemo(() => {
    const all = [...PRIMARY_NAV, ...LIBRARY_NAV, ...ACCOUNT_NAV];
    const seen = new Set<string>();
    return all
      .filter((n) => {
        if (seen.has(n.href)) return false;
        seen.add(n.href);
        return true;
      })
      .map((n) => ({
        kind: "nav" as const,
        id: "nav:" + n.href,
        item: n,
        run: () => {
          close();
          router.push(n.href);
        },
      }));
  }, [router]);

  const searchItems: Item[] = useMemo(
    () =>
      recent.items.map((term) => ({
        kind: "search" as const,
        id: "search:" + term,
        term,
        run: () => {
          try {
            localStorage.setItem("xemphim:lastTopic", term);
            localStorage.setItem("xemphim:lastMode", "search");
          } catch {
            /* ignore */
          }
          recent.add(term);
          close();
          router.push("/");
        },
      })),
    [recent, router],
  );

  const all = useMemo(() => [...navItems, ...searchItems], [navItems, searchItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((it) => {
      const label = it.kind === "nav" ? it.item.label : it.term;
      return label.toLowerCase().includes(q);
    });
  }, [all, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const target = el.children[active] as HTMLElement | undefined;
    target?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((v) => (filtered.length ? (v + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((v) => (filtered.length ? (v - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.run();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[18%] translate-y-0 gap-0 p-0 sm:max-w-xl rounded-3xl border-white/10 bg-card/95 shadow-2xl backdrop-blur-2xl overflow-hidden">
        <DialogTitle className="sr-only">Điều hướng nhanh</DialogTitle>
        <DialogDescription className="sr-only">
          Tìm trang hoặc tìm kiếm video nhanh.
        </DialogDescription>

        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onListKey}
            placeholder="Tìm trang, phòng xem chung hoặc tìm kiếm video..."
            className="h-14 flex-1 bg-transparent text-sm sm:text-base outline-none placeholder:text-muted-foreground"
            maxLength={100}
          />
          <kbd className="rounded-md border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            ESC
          </kbd>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Không có kết quả cho &quot;{query}&quot;.
          </p>
        ) : (
          <ul ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filtered.map((it, i) => {
              const Icon: LucideIcon = it.kind === "nav" ? it.item.icon : Clock;
              const label = it.kind === "nav" ? it.item.label : it.term;
              const sub = it.kind === "nav" ? it.item.href : "Tìm kiếm video";
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={it.run}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-all duration-150",
                      i === active
                        ? "bg-gradient-to-r from-rose-500/20 via-purple-500/10 to-transparent font-semibold text-foreground border-l-2 border-rose-500 shadow-sm"
                        : "text-foreground/80 hover:bg-white/5",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        i === active ? "text-rose-500" : "text-muted-foreground",
                      )}
                    />
                    <span className="flex-1 truncate">{label}</span>
                    <span className="truncate text-xs text-muted-foreground">{sub}</span>
                    {i === active ? (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
