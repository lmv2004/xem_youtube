import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background/60">
      <div className="container flex flex-col items-center justify-between gap-2 py-6 text-sm text-muted-foreground md:flex-row">
        <p>Dữ liệu từ YouTube Data API v3. Video thuộc bản quyền của các kênh tương ứng.</p>
        <div className="flex items-center gap-4">
          <Link href="/favorites" className="hover:text-foreground">Yêu thích</Link>
          <Link href="/history" className="hover:text-foreground">Lịch sử</Link>
          <Link href="/account" className="hover:text-foreground">Tài khoản</Link>
        </div>
      </div>
    </footer>
  );
}
