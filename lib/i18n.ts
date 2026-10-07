import messages from "./translations.json";
import type { Locale } from "./locale";

type Params = Record<string, string | number>;
const dictionary = messages as Record<string, { en: string; te: string }>;
export function translate(
  locale: Locale,
  key: string,
  params?: Params,
): string {
  const value = (
    locale === "vi" ? key : (dictionary[key]?.[locale] ?? key)
  ).replace(/&quot;/g, '"');
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    params?.[name] === undefined ? match : String(params[name]),
  );
}
export function translator(locale: Locale) {
  return Object.assign(
    (key: string, params?: Params) => translate(locale, key, params),
    { locale },
  );
}
