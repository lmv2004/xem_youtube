"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, ArrowRight, CornerDownLeft } from "lucide-react";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { cn } from "@/lib/utils";

const POPULAR_SUGGESTIONS = [
  "Âm nhạc thịnh hành",
  "Review phim",
  "Học lập trình Next.js",
  "Công nghệ AI mới nhất",
  "Nhạc Lo-fi chill",
  "Tin tức công nghệ",
];

export function HeaderSearch() {
  const router = useRouter();
  const recent = useRecentSearches();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Global keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        e.key === "/" &&
        activeTag !== "input" &&
        activeTag !== "textarea" &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    recent.add(trimmed);
    try {
      localStorage.setItem("xemphim:lastTopic", trimmed);
      localStorage.setItem("xemphim:lastMode", "search");
      window.dispatchEvent(
        new CustomEvent("xemphim:search", { detail: { topic: trimmed } }),
      );
    } catch {
      /* ignore */
    }
    setIsOpen(false);
    setMobileExpanded(false);
    router.push(`/?topic=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch(query);
  };

  return (
    <>
      {/* Mobile search trigger */}
      <button
        type="button"
        onClick={() => {
          setMobileExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        aria-label="Mở tìm kiếm"
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground md:hidden"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Main search input for Desktop / Mobile modal */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex-1 max-w-md lg:max-w-lg transition-all",
          mobileExpanded
            ? "fixed inset-x-0 top-0 z-50 flex items-center gap-2 bg-background/95 p-3 backdrop-blur-md md:static md:bg-transparent md:p-0"
            : "hidden md:flex",
        )}
      >
        <form
          onSubmit={handleSubmit}
          className="relative flex w-full items-center"
        >
          <div className="pointer-events-none absolute left-3.5 flex items-center text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Tìm video, nghệ sĩ, chủ đề, kênh..."
            className="h-10 w-full rounded-full border border-white/10 bg-white/5 pl-9 pr-24 text-sm text-foreground transition placeholder:text-muted-foreground focus:border-rose-500/50 focus:bg-card focus:outline-none focus:ring-4 focus:ring-rose-500/15"
          />

          <div className="absolute right-2 flex items-center gap-1">
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground lg:inline-block">
                /
              </kbd>
            )}

            <button
              type="submit"
              className="grid h-7 w-7 place-items-center rounded-full bg-rose-500/20 text-rose-400 transition hover:bg-rose-500 hover:text-white"
              aria-label="Tìm kiếm"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        {mobileExpanded && (
          <button
            type="button"
            onClick={() => setMobileExpanded(false)}
            className="shrink-0 rounded-xl bg-white/5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground md:hidden"
          >
            Đóng
          </button>
        )}

        {/* Suggestions & Recent Searches Dropdown */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-card/95 p-3.5 shadow-2xl backdrop-blur-2xl">
            {recent.items.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between px-2 pb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tìm kiếm gần đây
                  </span>
                  <button
                    type="button"
                    onClick={() => recent.clear()}
                    className="text-xs text-muted-foreground/80 hover:text-primary"
                  >
                    Xóa tất cả
                  </button>
                </div>
                <div className="flex flex-col gap-0.5">
                  {recent.items.slice(0, 5).map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setQuery(term);
                        triggerSearch(term);
                      }}
                      className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-foreground/90 transition hover:bg-foreground/5 hover:text-foreground"
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1">{term}</span>
                      <CornerDownLeft className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="px-2 pb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Gợi ý thịnh hành
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                {POPULAR_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setQuery(sug);
                      triggerSearch(sug);
                    }}
                    className="rounded-full border border-border/60 bg-secondary/70 px-2.5 py-1 text-xs text-secondary-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
