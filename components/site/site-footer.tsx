import Link from "next/link";
import { Heart, History } from "lucide-react";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-16 px-4 pb-8">
      <div className="container">
        <div className="glass rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Logo size={32} />
              <div>
                <p className="text-sm font-semibold">XemPhimYouTube</p>
                <p className="text-xs text-muted-foreground">
                  Đề xuất YouTube theo sở thích · 2026
                </p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link href="/favorites" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <Heart className="h-4 w-4" /> Yêu thích
              </Link>
              <Link href="/history" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <History className="h-4 w-4" /> Lịch sử
              </Link>
            </nav>
          </div>
          <p className="mt-6 flex items-center gap-1 text-xs text-muted-foreground">
            Dữ liệu từ YouTube Data API v3. Video thuộc bản quyền của các kênh tương ứng.
          </p>
        </div>
      </div>
    </footer>
  );
}
