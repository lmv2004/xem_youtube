"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ONBOARD_STORAGE_KEY = "xemphim:onboarded";
const INTERESTS_STORAGE_KEY = "xemphim:interests";

export const TOPIC_PRESETS = [
  { id: "Âm nhạc", label: "Âm nhạc" },
  { id: "Phim & Review", label: "Phim & Review" },
  { id: "Lập trình & CNTT", label: "Lập trình & CNTT" },
  { id: "Công nghệ & AI", label: "Công nghệ & AI" },
  { id: "Trò chơi / Gaming", label: "Trò chơi / Gaming" },
  { id: "Ẩm thực & Nấu ăn", label: "Ẩm thực & Nấu ăn" },
  { id: "Du lịch & Trải nghiệm", label: "Du lịch & Trải nghiệm" },
  { id: "Thể thao", label: "Thể thao" },
  { id: "Tin tức & Sự kiện", label: "Tin tức & Sự kiện" },
  { id: "Khoa học & Khám phá", label: "Khoa học & Khám phá" },
  { id: "Podcast & Talkshow", label: "Podcast & Talkshow" },
  { id: "Anime & Hoạt hình", label: "Anime & Hoạt hình" },
];

type Props = {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onComplete?: (selectedTopics: string[]) => void;
};

export function OnboardingModal({ isOpen, onOpenChange, onComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    try {
      const onboarded = localStorage.getItem(ONBOARD_STORAGE_KEY);
      const storedInterests = JSON.parse(
        localStorage.getItem(INTERESTS_STORAGE_KEY) ?? "[]",
      ) as string[];

      if (Array.isArray(storedInterests) && storedInterests.length > 0) {
        setSelected(storedInterests);
      }

      // If explicit prop is provided, respect it
      if (isOpen !== undefined) {
        setOpen(isOpen);
      } else if (!onboarded) {
        // Show after a brief delay for a polished entry
        const timer = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      /* ignore */
    }
  }, [isOpen]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      try {
        localStorage.setItem(ONBOARD_STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  };

  const toggleTopic = (topic: string) => {
    setSelected((prev) => {
      if (prev.includes(topic)) {
        return prev.filter((t) => t !== topic);
      }
      if (prev.length >= 5) {
        return [...prev.slice(1), topic];
      }
      return [...prev, topic];
    });
  };

  const handleSave = () => {
    try {
      localStorage.setItem(ONBOARD_STORAGE_KEY, "1");
      localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(selected));
    } catch {
      /* ignore */
    }
    handleOpenChange(false);
    onComplete?.(selected);
  };

  const handleSkip = () => {
    try {
      localStorage.setItem(ONBOARD_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg glass-strong border-border/80 p-6">
        <DialogHeader className="space-y-2">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/20 text-primary ring-1 ring-primary/40">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-display text-2xl font-bold">
            Chào mừng bạn đến với XemPhim
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            Bạn thường xem gì trên YouTube? Chọn 3-5 chủ đề để chúng tôi cá nhân hoá nội dung ngay
            trên trang chủ của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Chọn chủ đề yêu thích ({selected.length}/5):</span>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="hover:text-foreground"
              >
                Xóa chọn
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {TOPIC_PRESETS.map((t) => {
              const active = selected.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTopic(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-150",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 ring-1 ring-primary"
                      : "border border-border/70 bg-card/60 text-foreground/80 hover:border-primary/50 hover:bg-card hover:text-foreground",
                  )}
                >
                  {active ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : null}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleSkip}>
            Để sau
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="glow-primary"
          >
            Bắt đầu khám phá {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
