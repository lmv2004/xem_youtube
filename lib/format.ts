// Tiny client-safe formatting helpers shared by components.
// Pure functions only — no imports from server-only modules.

import { translate } from "./i18n";
import { INTL_LOCALES, type Locale } from "./locale";

export function formatViews(count: number, locale: Locale = "vi"): string {
  if (!Number.isFinite(count) || count <= 0) return "—";
  if (locale !== "vi")
    return `${new Intl.NumberFormat(INTL_LOCALES[locale], { notation: "compact", maximumFractionDigits: 1 }).format(count)} ${translate(locale, "lượt xem")}`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M lượt xem`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K lượt xem`;
  return `${count} lượt xem`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
