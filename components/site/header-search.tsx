"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { extractYouTubeId } from "@/lib/youtube-url";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { cn } from "@/lib/utils";

export function HeaderSearch() {
  const router = useRouter();
  const recent = useRecentSearches();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (expanded) input.current?.focus();
  }, [expanded]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="Mở tìm kiếm"
        aria-expanded={expanded}
        aria-controls="header-search"
        onClick={() => setExpanded(!expanded)}
        className="ml-auto grid h-10 w-10 place-items-center rounded-xl hover:bg-muted md:hidden"
      >
        <Search className="h-5 w-5" />
      </button>
      <form
        id="header-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const term = query.trim();
          if (!term) return;
          const id = extractYouTubeId(term);
          if (!id) recent.add(term);
          setExpanded(false);
          router.push(
            id ? `/watch/${id}` : `/?topic=${encodeURIComponent(term)}`,
          );
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setExpanded(false);
            trigger.current?.focus();
          }
        }}
        className={cn(
          "items-center gap-2 rounded-xl border border-border bg-background p-1.5 md:relative md:inset-auto md:flex md:max-w-md md:flex-1",
          expanded
            ? "absolute inset-x-3 top-full mt-2 flex shadow-lg md:mt-0"
            : "hidden",
        )}
      >
        <input
          ref={input}
          type="search"
          minLength={2}
          maxLength={500}
          aria-label="Tìm video hoặc dán liên kết YouTube"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm video hoặc dán link YouTube"
          className="h-9 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
        />
        <button
          type="submit"
          aria-label="Tìm kiếm"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <Search className="h-4 w-4" />
        </button>
        {expanded && (
          <button
            type="button"
            aria-label="Đóng tìm kiếm"
            onClick={() => {
              setExpanded(false);
              trigger.current?.focus();
            }}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>
    </>
  );
}
