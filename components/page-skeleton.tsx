"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "@/components/locale-provider";
export function PageSkeleton({ kind = "grid" }: { kind?: "grid" | "room" | "account" }) {
  const t = useTranslations();
  return <section role="status" aria-busy="true" className="space-y-6">
    <span className="sr-only">{t("Đang tải nội dung…")}</span>
    <div aria-hidden="true" className="space-y-6">
      <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 max-w-full" /></div>
      {kind === "room" ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><Skeleton className="aspect-video rounded-2xl"/><Skeleton className="h-96 rounded-2xl"/></div>
        : kind === "account" ? <div className="grid gap-4 sm:grid-cols-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-2xl"/>)}</div>
        : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0,1,2,3,4,5].map(i => <div key={i} className="space-y-3"><Skeleton className="aspect-video rounded-xl"/><Skeleton className="h-4 w-4/5"/><Skeleton className="h-3 w-1/2"/></div>)}</div>}
    </div>
  </section>;
}
