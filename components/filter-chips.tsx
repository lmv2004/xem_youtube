"use client";
import { TOPIC_SUGGESTIONS } from "@/lib/topics";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null;
  onChange: (topic: string | null) => void;
  disabled?: boolean;
};

/**
 * Horizontally scrolling category chips, mirroring YouTube's topic bar.
 * Selecting the active chip again clears it and returns to the main feed.
 */
export function FilterChips({ value, onChange, disabled }: Props) {
  return (
    <div className="mask-fade-r -mx-1 overflow-x-auto pb-1">
      <div className="flex w-max items-center gap-2 px-1">
        <Chip active={value === null} disabled={disabled} onClick={() => onChange(null)}>
          Tất cả
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
        "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-all disabled:opacity-50",
        active
          ? "bg-foreground text-background"
          : "bg-foreground/5 text-foreground ring-1 ring-border hover:bg-foreground/10",
      )}
    >
      {children}
    </button>
  );
}
