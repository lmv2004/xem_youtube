"use client";
import { useTranslations } from "@/components/locale-provider";

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
  const t = useTranslations();
  function randomTopic() {
    const pool = TOPIC_SUGGESTIONS.filter((t) => t !== value);
    const next =
      pool[Math.floor(Math.random() * pool.length)] ?? TOPIC_SUGGESTIONS[0];
    onChange(next);
  }

  return (
    <div className="mask-fade-r -mx-1 overflow-x-auto py-1 scrollbar-none">
      <div className="flex w-max items-center gap-2 px-1">
        <Chip
          active={value === null}
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {t("Tất cả")}
          </span>
        </Chip>

        {TOPIC_SUGGESTIONS.map((topic) => (
          <Chip
            key={t(topic)}
            active={value === topic}
            disabled={disabled}
            onClick={() => onChange(value === topic ? null : topic)}
          >
            {t(topic)}
          </Chip>
        ))}

        <button
          type="button"
          onClick={randomTopic}
          disabled={disabled}
          title={t("Chọn chủ đề ngẫu nhiên")}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-rose-500/30 bg-rose-500/5 px-3.5 py-1.5 text-xs font-semibold text-rose-500 transition-all duration-200 disabled:opacity-50",
            "hover:border-rose-500/60 hover:bg-rose-500/10 hover:shadow-xs active:scale-95",
          )}
        >
          <Shuffle className="h-3.5 w-3.5" />
          {t("Khám phá ngẫu nhiên")}
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
        "whitespace-nowrap rounded-full min-h-9 px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 disabled:opacity-50 backdrop-blur-md",
        active
          ? "bg-rose-600 text-white shadow-md shadow-rose-600/25 border border-transparent scale-[1.02]"
          : "border border-border/80 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border",
      )}
    >
      {children}
    </button>
  );
}
