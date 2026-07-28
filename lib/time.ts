// Tiny i18n-friendly "time ago" helper without external deps.
const VI: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

export function formatDistanceToNow(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  for (const [unit, seconds] of VI) {
    if (abs >= seconds || unit === "second") {
      const value = Math.round(diffSeconds / seconds);
      return rtf.format(value, unit);
    }
  }
  return rtf.format(0, "second");
}
