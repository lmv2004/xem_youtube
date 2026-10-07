export const LOCALES = ["vi", "en", "te"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "xemphim_locale";
export const LOCALE_NAMES: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  te: "తెలుగు",
};
export const INTL_LOCALES: Record<Locale, string> = {
  vi: "vi-VN",
  en: "en-US",
  te: "te-IN",
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Explicit choice wins. Country is an approximate fallback, not a language. */
export function resolveLocale(
  saved?: string | null,
  languages?: string | null,
  country?: string | null,
): Locale {
  if (isLocale(saved)) return saved;
  const preferences = (languages ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const quality = params.find((p) => p.trim().startsWith("q="));
      return {
        language: tag.toLowerCase().split("-")[0],
        q: quality ? Number(quality.trim().slice(2)) : 1,
        index,
      };
    })
    .filter((p) => Number.isFinite(p.q) && p.q > 0 && p.q <= 1)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const preference of preferences)
    if (isLocale(preference.language)) return preference.language;
  // India has many languages; Telugu is selected only by preference or choice.
  return country?.toUpperCase() === "VN" ? "vi" : "en";
}
