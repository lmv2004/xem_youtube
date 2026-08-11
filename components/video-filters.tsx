"use client";
import { Check, ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_FILTERS,
  DURATION_LABELS,
  ORDER_LABELS,
  UPLOAD_DATE_LABELS,
  countActiveFilters,
  isDefaultFilters,
  type DurationFilter,
  type SortOrder,
  type UploadDateFilter,
  type VideoFilters,
} from "@/lib/filters";
import { cn } from "@/lib/utils";

type Props = {
  value: VideoFilters;
  onChange: (filters: VideoFilters) => void;
  disabled?: boolean;
};

export function VideoFiltersBar({ value, onChange, disabled }: Props) {
  const activeCount = countActiveFilters(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 pr-1 text-xs text-muted-foreground">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Bộ lọc
        {activeCount > 0 ? (
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">
            {activeCount}
          </Badge>
        ) : null}
      </span>

      <FilterSelect
        label="Sắp xếp"
        options={ORDER_LABELS}
        selected={value.order}
        isDefault={value.order === DEFAULT_FILTERS.order}
        disabled={disabled}
        onSelect={(key) => onChange({ ...value, order: key as SortOrder })}
      />
      <FilterSelect
        label="Thời lượng"
        options={DURATION_LABELS}
        selected={value.duration}
        isDefault={value.duration === DEFAULT_FILTERS.duration}
        disabled={disabled}
        onSelect={(key) => onChange({ ...value, duration: key as DurationFilter })}
      />
      <FilterSelect
        label="Ngày đăng"
        options={UPLOAD_DATE_LABELS}
        selected={value.uploadDate}
        isDefault={value.uploadDate === DEFAULT_FILTERS.uploadDate}
        disabled={disabled}
        onSelect={(key) => onChange({ ...value, uploadDate: key as UploadDateFilter })}
      />

      {isDefaultFilters(value) ? null : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-muted-foreground"
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Đặt lại
        </Button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  options,
  selected,
  isDefault,
  disabled,
  onSelect,
}: {
  label: string;
  options: Record<string, string>;
  selected: string;
  isDefault: boolean;
  disabled?: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-8 rounded-full text-xs font-normal",
            !isDefault && "border-primary/40 bg-primary/10 text-foreground",
          )}
        >
          {options[selected] ?? label}
          <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 glass-strong">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(options).map(([key, text]) => (
          <DropdownMenuItem key={key} onSelect={() => onSelect(key)} className="gap-2">
            <span className="flex-1">{text}</span>
            <Check
              className={cn(
                "h-4 w-4 text-primary",
                selected === key ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
