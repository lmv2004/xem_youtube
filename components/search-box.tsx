"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { ArrowUpLeft, Clock, Flame, Search } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { usePopularSearches } from "@/hooks/use-popular-searches";
import { getSearchSuggestions } from "@/lib/search-suggestions";
import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "@/lib/search-query";
import { cn } from "@/lib/utils";

/** Both search entry points share the same keyboard, history and suggestion behavior. */
export function SearchBox({
  value,
  onChange,
  onSearch,
  inputRef: providedRef,
  placeholder,
  className,
  inputClassName,
  leading,
  actions,
  id,
  onEscape,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  placeholder: string;
  className?: string;
  inputClassName?: string;
  leading?: ReactNode;
  actions: ReactNode;
  id?: string;
  onEscape?: () => void;
}) {
  const t = useTranslations();
  const recent = useRecentSearches();
  const defaultRef = useRef<HTMLInputElement>(null);
  const inputRef = providedRef ?? defaultRef;
  const formRef = useRef<HTMLFormElement>(null);
  const composing = useRef(false);
  const compositionEnter = useRef(false);
  const [open, setOpen] = useState(false);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const popular = usePopularSearches(t.locale, open);
  const listId = useId();
  const hintId = useId();
  const suggestions = getSearchSuggestions(
    value,
    recent.items,
    t.locale,
    6,
    popular.items.map((item) => item.term),
  );
  const expanded = open && suggestions.length > 0;
  const activeIndex = suggestions.findIndex((item) => item.term === activeTerm);
  const activeId =
    expanded && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined;

  const close = () => {
    setOpen(false);
    setActiveTerm(null);
  };
  const choose = (term: string) => {
    close();
    onChange(term);
    onSearch(term);
  };

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!formRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveTerm(null);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);

  useEffect(() => {
    if (activeId)
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  return (
    <form
      ref={formRef}
      id={id}
      role="search"
      className={className}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          close();
      }}
      onPointerDown={() => {
        compositionEnter.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          close();
          onEscape?.();
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (!composing.current && !compositionEnter.current)
          choose(value.trim());
      }}
    >
      {leading}
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        minLength={SEARCH_MIN_LENGTH}
        maxLength={SEARCH_MAX_LENGTH}
        aria-label={t("Tìm video hoặc dán liên kết YouTube")}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={activeId}
        aria-describedby={expanded ? hintId : undefined}
        value={value}
        placeholder={placeholder}
        className={inputClassName}
        onChange={(event) => {
          onChange(event.target.value);
          setActiveTerm(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={(event) => {
          compositionEnter.current = false;
          if (
            composing.current ||
            event.nativeEvent.isComposing ||
            event.nativeEvent.keyCode === 229
          ) {
            compositionEnter.current = event.key === "Enter";
            event.stopPropagation();
            return;
          }
          if (
            (event.key === "ArrowDown" || event.key === "ArrowUp") &&
            suggestions.length
          ) {
            event.preventDefault();
            setOpen(true);
            const next =
              !expanded || activeIndex < 0
                ? event.key === "ArrowDown"
                  ? 0
                  : suggestions.length - 1
                : Math.max(
                    0,
                    Math.min(
                      suggestions.length - 1,
                      activeIndex + (event.key === "ArrowDown" ? 1 : -1),
                    ),
                  );
            setActiveTerm(suggestions[next].term);
          } else if (event.key === "Enter" && expanded && activeIndex >= 0) {
            event.preventDefault();
            choose(suggestions[activeIndex].term);
          } else if (event.key === "Escape" && expanded) {
            event.preventDefault();
            close();
          }
        }}
      />
      {actions}
      {expanded && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl">
          <div
            id={listId}
            role="listbox"
            aria-label={t("Gợi ý từ khóa")}
            className="max-h-[min(23rem,45dvh)] overflow-y-auto overscroll-contain p-1.5 sm:p-2"
          >
            {(["recent", "popular", "suggested"] as const).map((source) => {
              const group = suggestions.filter(
                (item) => item.source === source,
              );
              if (!group.length) return null;
              const Icon =
                source === "recent"
                  ? Clock
                  : source === "popular"
                    ? Flame
                    : Search;
              return (
                <div
                  key={source}
                  role="group"
                  aria-labelledby={`${listId}-${source}`}
                >
                  <p
                    id={`${listId}-${source}`}
                    className="px-3 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground"
                  >
                    {source === "recent"
                      ? t("Tìm kiếm gần đây")
                      : source === "popular"
                        ? t("Được tìm nhiều tuần này")
                        : t("Gợi ý từ khóa")}
                  </p>
                  <ul role="presentation">
                    {group.map((item) => {
                      const index = suggestions.indexOf(item);
                      return (
                        <li
                          id={`${listId}-${index}`}
                          key={item.term}
                          role="option"
                          aria-selected={activeIndex === index}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseMove={() => setActiveTerm(item.term)}
                          onClick={() => choose(item.term)}
                          className={cn(
                            "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted",
                            activeIndex === index && "bg-muted",
                          )}
                        >
                          <Icon
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {item.term}
                          </span>
                          <ArrowUpLeft
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
            <p id={hintId} className="text-[11px] text-muted-foreground">
              {t("↑ ↓ để chọn · Enter để tìm · Esc để đóng")}
            </p>
            {recent.items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  recent.clear();
                  setActiveTerm(null);
                  inputRef.current?.focus();
                }}
                className="shrink-0 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("Xóa lịch sử")}
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
