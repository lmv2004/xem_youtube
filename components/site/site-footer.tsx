import { Wordmark } from "./logo";

/**
 * Footer carries no navigation links: those already exist in the sidebar
 * (desktop) and bottom bar (mobile). It is reduced to branding plus the data
 * attribution required by the YouTube API terms.
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 px-3 pb-8 sm:mt-16 sm:px-4">
      <div className="container">
        <div className="glass rounded-2xl p-5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Wordmark size={30} />
            </div>
            <p className="text-xs text-muted-foreground">
              Đề xuất YouTube theo sở thích · 2026
            </p>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            Dữ liệu từ YouTube Data API v3. Video thuộc bản quyền của các kênh tương ứng.
          </p>
        </div>
      </div>
    </footer>
  );
}
