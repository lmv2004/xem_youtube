"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/locale";
import { translator } from "@/lib/i18n";

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
} | null>(null);
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, updateLocale] = useState(initialLocale);
  const router = useRouter();
  const setLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return;
      document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      updateLocale(next);
      document.documentElement.lang = next;
      router.refresh();
    },
    [router],
  );
  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("LocaleProvider is required");
  return value;
}
export function useTranslations() {
  const { locale } = useLocale();
  return useMemo(() => translator(locale), [locale]);
}
