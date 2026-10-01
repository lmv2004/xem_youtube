import { Skeleton } from "@/components/ui/skeleton";

export default function WatchLoading() {
  return (
    <main
      className="container py-8"
      aria-busy="true"
      aria-label="Đang mở video"
    >
      <p role="status" className="mb-5 text-sm text-muted-foreground">
        Đang chuẩn bị video…
      </p>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Skeleton className="aspect-video rounded-2xl" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((id) => (
            <Skeleton key={id} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
