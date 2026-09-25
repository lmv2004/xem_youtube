import { Wordmark } from "./logo";

/**
 * Modern luxury footer with YouTube API attribution,
 * branding lockup and subtle terms/policy info.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 px-3 pb-8 sm:mt-24 sm:px-4">
      <div className="container max-w-7xl mx-auto">
        <div className="rounded-3xl border border-white/10 bg-card/75 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <Wordmark size={28} />
              <p className="text-xs text-muted-foreground">
                Nền tảng khám phá video điện ảnh & xem chung thời gian thực
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
              <span className="hover:text-rose-400 cursor-pointer transition-colors">Điều khoản dịch vụ</span>
              <span>·</span>
              <span className="hover:text-rose-400 cursor-pointer transition-colors">Chính sách bảo mật</span>
              <span>·</span>
              <span className="hover:text-rose-400 cursor-pointer transition-colors">Hướng dẫn sử dụng</span>
            </div>
          </div>
          <div className="mt-6 border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground/75 gap-2">
            <p>Dữ liệu cung cấp qua YouTube Data API v3. Nội dung và bản quyền video thuộc về các tác giả tương ứng.</p>
            <p className="font-medium text-muted-foreground">© 2026 XemPhim. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
