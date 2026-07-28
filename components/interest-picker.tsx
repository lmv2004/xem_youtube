"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "xemphim:interests";
const MAX_INTERESTS = 4;

const SUGGESTIONS: ReadonlyArray<string> = [
  "Nhạc Việt",
  "Phim ngắn",
  "Học lập trình",
  "Ẩm thực",
  "Du lịch",
  "Tin tức",
  "Thể thao",
  "Công nghệ",
  "Game",
  "Sức khoẻ",
];

type Props = {
  value?: string[];
  onChange?: (next: string[]) => void;
};

export function InterestPicker({ value, onChange }: Props) {
  const [internal, setInternal] = useState<string[]>([]);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    if (value) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setInternal(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, [value]);

  // Persist whenever internal changes.
  useEffect(() => {
    if (value) return;
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(internal));
  }, [internal, value]);

  const current = value ?? internal;
  function toggle(interest: string) {
    const exists = current.includes(interest);
    let next: string[];
    if (exists) {
      next = current.filter((i) => i !== interest);
    } else {
      if (current.length >= MAX_INTERESTS) {
        next = [...current.slice(1), interest];
      } else {
        next = [...current, interest];
      }
    }
    if (value && onChange) onChange(next);
    else setInternal(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Chọn tối đa {MAX_INTERESTS} sở thích để cá nhân hoá đề xuất. Sở thích được lưu cục bộ.
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => {
          const active = current.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary text-secondary-foreground hover:border-primary/40",
              )}
              aria-pressed={active}
            >
              {active ? <Check className="h-3 w-3" /> : null}
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
