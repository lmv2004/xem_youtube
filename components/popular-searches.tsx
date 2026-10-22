"use client";

import { Flame, RefreshCw } from "lucide-react";
import { useId } from "react";
import { useTranslations } from "@/components/locale-provider";
import { usePopularSearches } from "@/hooks/use-popular-searches";
import { INTL_LOCALES } from "@/lib/locale";

export function PopularSearches({
  onSearch,
}: {
  onSearch: (term: string) => void;
}) {
  const t = useTranslations();
  const popular = usePopularSearches(t.locale);
  const headingId = useId();
  const number = new Intl.NumberFormat(INTL_LOCALES[t.locale]);

  return (
    <section
      aria-labelledby={headingId}
      className="mt-5 border-t border-border pt-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2
          id={headingId}
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <Flame aria-hidden="true" className="h-4 w-4 text-primary" />
          {t("Được tìm nhiều tuần này")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("Trên XemPhim · 7 ngày gần nhất")}
        </p>
      </div>
      {popular.items.length > 0 ? (
        <>
          <ol className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
            {popular.items.map((item, index) => (
              <li key={item.term} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onSearch(item.term)}
                  aria-label={t(
                    "Tìm {keyword}, hạng {rank}, {count} lượt tìm",
                    {
                      keyword: item.term,
                      rank: number.format(index + 1),
                      count: number.format(item.count),
                    },
                  )}
                  className="flex min-h-12 max-w-64 items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-left hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    aria-hidden="true"
                    className="w-5 text-center text-sm font-semibold tabular-nums text-muted-foreground"
                  >
                    {number.format(index + 1)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {item.term}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t("{count} lượt tìm", {
                        count: number.format(item.count),
                      })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-1 text-[11px] text-muted-foreground sm:hidden">
            {t("Vuốt để xem thêm từ khóa")}
          </p>
        </>
      ) : popular.loading || (!popular.updatedAt && !popular.error) ? (
        <div
          role="status"
          aria-label={t("Đang tải từ khóa phổ biến")}
          className="flex gap-2 overflow-hidden"
        >
          {[0, 1, 2].map((key) => (
            <div
              key={key}
              aria-hidden="true"
              className="h-12 w-40 shrink-0 animate-pulse rounded-xl bg-muted"
            />
          ))}
          <span className="sr-only">{t("Đang tải từ khóa phổ biến")}</span>
        </div>
      ) : !popular.error ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            "Chưa đủ lượt tìm kiếm chung. Từ khóa sẽ xuất hiện khi có ít nhất hai người cùng tìm.",
          )}
        </p>
      ) : null}
      {popular.error && (
        <div
          role="status"
          className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        >
          <span>
            {popular.items.length
              ? t(
                  "Chưa cập nhật được bảng xếp hạng. Đang hiển thị dữ liệu đã tải.",
                )
              : t("Chưa tải được từ khóa phổ biến.")}
          </span>
          <button
            type="button"
            disabled={popular.loading}
            onClick={() => void popular.refresh()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 font-medium text-foreground hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            {t("Thử lại")}
          </button>
        </div>
      )}
    </section>
  );
}
