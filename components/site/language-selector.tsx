"use client";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { isLocale, LOCALES, LOCALE_NAMES } from "@/lib/locale";

export function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  const t = useTranslations();
  return (
    <label className="relative flex shrink-0 items-center rounded-xl border border-border bg-background px-2 py-1.5 text-xs">
      <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t("Ngôn ngữ")}</span>
      <select
        aria-label={t("Ngôn ngữ")}
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
        className="ml-1 w-14 cursor-pointer bg-background py-1 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:w-24"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} lang={code}>
            {LOCALE_NAMES[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
