"use client";
import { useTranslations } from "@/components/locale-provider";
export function SkipLink() {
  const t = useTranslations();
  return <a href="#main-content" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground shadow-lg focus:translate-y-0">{t("Đến nội dung chính")}</a>;
}
