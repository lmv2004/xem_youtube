import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Explorer } from "@/components/explorer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex-1 space-y-8 py-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Khám phá</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Video YouTube theo sở thích của bạn</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Chọn vài sở thích, hệ thống sẽ tự động gợi ý video xu hướng nhất. Bạn có thể lưu video
            vào danh sách cá nhân để xem lại bất cứ lúc nào.
          </p>
        </header>
        <Explorer />
      </main>
      <SiteFooter />
    </div>
  );
}
