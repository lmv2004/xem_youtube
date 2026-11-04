"use client";
import { useTranslations } from "@/components/locale-provider";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { getSearchDestination } from "@/lib/search-query";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { cn } from "@/lib/utils";
import { SearchBox } from "@/components/search-box";
import { recordSearch } from "@/lib/search-tracking";

export function HeaderSearch() {
  const t = useTranslations();
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
        aria-label={t("Mở tìm kiếm")}
        aria-expanded={expanded}
        aria-controls="header-search"
        onClick={() => setExpanded(!expanded)}
        className="ml-auto grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
      >
        <Search className="h-5 w-5" />
      </button>

      <SearchBox
        id="header-search"
        value={query}
        onChange={setQuery}
        inputRef={input}
        placeholder={t("Tìm video hoặc dán link YouTube...")}
        inputClassName="h-9 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground/60"
        onSearch={(term) => {
          const destination = getSearchDestination(term);
          if (!destination) return;
          if (destination.keyword) {
            recent.add(destination.keyword);
            recordSearch(destination.keyword, t.locale);
          }
          setExpanded(false);
          router.push(destination.href);
        }}
        onEscape={() => {
          if (expanded) {
            setExpanded(false);
            trigger.current?.focus();
          }
        }}
        className={cn(
          "items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2 py-1 transition-all duration-200",
          "focus-within:border-rose-500/50 focus-within:bg-card focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:shadow-md",
          "md:relative md:inset-auto md:flex md:max-w-md md:flex-1",
          expanded
            ? "absolute inset-x-3 top-full mt-2 flex shadow-xl bg-card border-border md:mt-0"
            : "hidden",
        )}
        actions={
          <>
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  input.current?.focus();
                }}
                aria-label={t("Xóa")}
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}

            <button
              type="submit"
              aria-label={t("Tìm kiếm")}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500"
            >
              <Search className="h-4 w-4" />
            </button>

            {expanded && (
              <button
                type="button"
                aria-label={t("Đóng tìm kiếm")}
                onClick={() => {
                  setExpanded(false);
                  trigger.current?.focus();
                }}
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted md:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        }
      />
    </>
  );
}
