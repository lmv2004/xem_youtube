"use client";
import { useTranslations } from "@/components/locale-provider";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, Clock, type LucideIcon } from "lucide-react";
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
import { getSearchDestination, SEARCH_MAX_LENGTH } from "@/lib/search-query";
import { recordSearch } from "@/lib/search-tracking";
import { cn } from "@/lib/utils";

type Item =
  | { kind: "nav"; id: string; item: NavItem; run: () => void }
  | { kind: "search"; id: string; term: string; typed: boolean; run: () => void };

/**
 * Global command palette opened with Ctrl+K / Cmd+K.
 * Keyboard: ↑/↓ chọn, Enter chạy, Esc đóng. Lọc theo chuỗi đang gõ.
 */
export function CommandPalette() {
  const t = useTranslations();
  const router = useRouter();
  const { items: recentItems, add: addRecentSearch } = useRecentSearches();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const composing = useRef(false);
  const listId = useId();

  useEffect(() => {
    if (!open) composing.current = false;
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (composing.current || e.isComposing || e.keyCode === 229 || e.repeat)
        return;
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
  const runSearch = useCallback(
    (value: string) => {
      const destination = getSearchDestination(value);
      if (!destination) return;
      if (destination.keyword) {
        addRecentSearch(destination.keyword);
        recordSearch(destination.keyword, t.locale);
      }
      setOpen(false);
      router.push(destination.href);
    },
    [addRecentSearch, router, t.locale],
  );

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
      recentItems.map((term) => ({
        kind: "search" as const,
        id: "search:" + term,
        term,
        typed: false,
        run: () => runSearch(term),
      })),
    [recentItems, runSearch],
  );

  const all = useMemo(
    () => [...navItems, ...searchItems],
    [navItems, searchItems],
  );

  const filtered = useMemo(() => {
    const term = query.trim();
    const q = term.toLowerCase();
    if (!q) return all;
    const matches = all.filter((it) => {
      const label = it.kind === "nav" ? t(it.item.label) : it.term;
      return (
        label.toLowerCase().includes(q) &&
        (it.kind !== "search" || label.toLowerCase() !== q)
      );
    });
    if (!getSearchDestination(term)) return matches;
    return [
      {
        kind: "search" as const,
        id: "query:" + term,
        term,
        typed: true,
        run: () => runSearch(term),
      },
      ...matches,
    ];
  }, [all, query, t, runSearch]);

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
    if (
      composing.current ||
      e.nativeEvent.isComposing ||
      e.nativeEvent.keyCode === 229
    ) {
      e.stopPropagation();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((v) => (filtered.length ? (v + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((v) =>
        filtered.length ? (v - 1 + filtered.length) % filtered.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) filtered[active]?.run();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (composing.current || event.isComposing || event.keyCode === 229)
            event.preventDefault();
        }}
        className="top-[18%] translate-y-0 gap-0 overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl sm:max-w-xl"
      >
        <DialogTitle className="sr-only">{t("Điều hướng nhanh")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("Tìm trang hoặc tìm kiếm video nhanh.")}{" "}
        </DialogDescription>

        <div className="flex items-center gap-3 border-b border-border px-4 pr-12">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            role="combobox"
            aria-label={t("Điều hướng nhanh")}
            aria-autocomplete="list"
            aria-expanded={filtered.length > 0}
            aria-controls={filtered.length ? listId : undefined}
            aria-activedescendant={
              filtered[active] ? `${listId}-${active}` : undefined
            }
            autoComplete="off"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onListKey}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            placeholder={t("Tìm trang, phòng xem chung hoặc tìm kiếm video...")}
            className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:text-base"
            maxLength={SEARCH_MAX_LENGTH}
          />
          <kbd
            aria-hidden="true"
            className="hidden rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground sm:block"
          >
            ESC
          </kbd>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {t("Không có kết quả cho &quot;")}
            {query}&quot;.
          </p>
        ) : (
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label={t("Điều hướng nhanh")}
            className="max-h-[min(24rem,55dvh)] space-y-1 overflow-y-auto overscroll-contain p-2"
          >
            {filtered.map((it, i) => {
              const Icon: LucideIcon =
                it.kind === "nav" ? it.item.icon : it.typed ? Search : Clock;
              const label = it.kind === "nav" ? t(it.item.label) : it.term;
              const sub =
                it.kind === "nav"
                  ? it.item.href
                  : getSearchDestination(it.term)?.keyword === null
                    ? t("Mở video YouTube")
                    : t("Tìm kiếm video");
              return (
                <li key={it.id} role="presentation">
                  <button
                    id={`${listId}-${i}`}
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    tabIndex={-1}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={it.run}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      i === active
                        ? "bg-muted font-semibold text-foreground"
                        : "text-foreground/80 hover:bg-muted",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        i === active
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <span className="hidden max-w-40 truncate text-xs text-muted-foreground sm:block">
                      {sub}
                    </span>
                    {i === active ? (
                      <CornerDownLeft
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0 text-primary"
                      />
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
