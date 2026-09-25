"use client";

import { Shuffle, Sparkles } from "lucide-react";
import { TOPIC_SUGGESTIONS } from "@/lib/topics";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null;
  onChange: (topic: string | null) => void;
  disabled?: boolean;
};

/**
 * Horizontally scrolling category chips with vibrant colors and neon active states.
 */
export function FilterChips({ value, onChange, disabled }: Props) {
  function randomTopic() {
    const pool = TOPIC_SUGGESTIONS.filter((t) => t !== value);
    const next = pool[Math.floor(Math.random() * pool.length)] ?? TOPIC_SUGGESTIONS[0];
    onChange(next);
  }

  return (
    <div className="mask-fade-r -mx-1 overflow-x-auto pb-1 scrollbar-none">
      <div className="flex w-max items-center gap-2 px-1">
        <Chip active={value === null} disabled={disabled} onClick={() => onChange(null)}>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Tất cả
          </span>
        </Chip>

        {TOPIC_SUGGESTIONS.map((topic) => (
          <Chip
            key={topic}
            active={value === topic}
            disabled={disabled}
            onClick={() => onChange(value === topic ? null : topic)}
          >
            {topic}
          </Chip>
        ))}

        <button
          type="button"
          onClick={randomTopic}
          disabled={disabled}
          title="Chọn chủ đề ngẫu nhiên"
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-white/20 bg-white/5 px-3.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-50",
            "text-muted-foreground hover:border-purple-500/60 hover:bg-purple-500/10 hover:text-purple-400 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)]",
          )}
        >
          <Shuffle className="h-3.5 w-3.5" />
          Khám phá ngẫu nhiên
        </button>
      </div>
    </div>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 disabled:opacity-50 backdrop-blur-md",
        active
          ? "bg-gradient-to-r from-rose-500 via-rose-600 to-orange-500 text-white shadow-[0_0_18px_rgba(255,42,84,0.45)] ring-1 ring-white/30"
          : "border border-white/10 bg-white/5 text-muted-foreground hover:border-white/25 hover:bg-white/10 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
