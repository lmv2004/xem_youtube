"use client";
import { Languages, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { isLocale, LOCALES, LOCALE_NAMES } from "@/lib/locale";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
export function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  const t = useTranslations();
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="shrink-0 gap-1.5 px-2.5 text-xs" aria-label={t("Ngôn ngữ") + ": " + LOCALE_NAMES[locale]}>
        <Languages aria-hidden="true"/><span className="uppercase sm:hidden">{locale}</span><span className="hidden sm:inline" lang={locale}>{LOCALE_NAMES[locale]}</span><ChevronDown aria-hidden="true" className="!h-3 !w-3"/>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-40">
      <DropdownMenuRadioGroup value={locale} onValueChange={value => { if(isLocale(value)) setLocale(value); }}>
        {LOCALES.map(code => <DropdownMenuRadioItem key={code} value={code} lang={code}>{LOCALE_NAMES[code]}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
