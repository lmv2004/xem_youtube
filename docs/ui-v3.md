# Giao diện v3 — ghi chú triển khai

Tài liệu mô tả các thay đổi giao diện và tính năng được thêm trong nhánh
`feat/youtube-ui-v3`.

## 1. Bố cục kiểu YouTube

- `components/site/app-sidebar.tsx` — thanh điều hướng dọc.
  - Desktop: cột dính (sticky), thu gọn còn icon, trạng thái lưu ở
    `localStorage["xemphim:sidebar:collapsed"]`.
  - Mobile: nút nổi góc dưới trái mở drawer overlay tự viết (không dùng
    `components/ui/sheet.tsx` để tránh phụ thuộc vào hành vi focus-trap của dialog).
- `components/site/site-shell.tsx` — khung trang dùng chung
  (`GradientMesh` + `SiteHeader` + sidebar + `SiteFooter`). Các route khác có thể
  chuyển sang dùng component này để đồng bộ bố cục.
- `components/filter-chips.tsx` — thanh chip chủ đề cuộn ngang, lấy dữ liệu từ
  `TOPIC_SUGGESTIONS`.

## 2. Chế độ sáng / tối

- `components/theme/theme-provider.tsx` — provider tự viết, **không thêm
  dependency mới**. Hỗ trợ `light` / `dark` / `system`, lưu ở
  `localStorage["xemphim:theme"]`.
- `app/layout.tsx` đã bỏ `className="dark"` cứng trên thẻ `<html>` và thêm một
  inline script chạy trước khi paint để tránh nháy màu (FOUC).
- `app/globals.css` vốn đã có sẵn cả hai bộ token `:root` (sáng) và `.dark`, nên
  không cần sửa CSS.

> Lưu ý: một số class cũ dạng `bg-white/5`, `ring-white/10` chỉ hợp với nền tối.
> Những chỗ đã đổi sang `bg-foreground/5`, `ring-border`. Nếu còn trang nào hiển
> thị lạ ở chế độ sáng, thay theo cùng quy tắc này.

## 3. Phân trang + infinite scroll

- `lib/youtube-search.ts` (mới) — bản có phân trang của `searchVideos` /
  `listTrending`, trả thêm `nextPageToken`.
  - Viết thành file riêng thay vì sửa `lib/youtube.ts` vì module cũ đang được
    nhiều route import với chữ ký hàm cố định.
  - Khác biệt quan trọng: không tự sắp xếp lại kết quả theo lượt xem, để tuỳ chọn
    `order=date` thực sự trả về video mới nhất.
- `app/api/videos/route.ts` nhận thêm `pageToken`, `order`, `duration`,
  `uploadDate`; trả về `nextPageToken`.
- `components/hero-explorer.tsx` dùng `IntersectionObserver` với
  `rootMargin: "600px"` để nạp trước khi người dùng chạm đáy, kèm lọc trùng `id`.

## 4. Bộ lọc nâng cao

- `lib/filters.ts` — kiểu dữ liệu + nhãn tiếng Việt + chuyển đổi sang tham số của
  YouTube Data API. File này không import gì của React hay server nên dùng được cả
  hai phía.
- `components/video-filters.tsx` — ba dropdown: sắp xếp, thời lượng, ngày đăng.
- Endpoint `chart=mostPopular` không nhận tham số lọc, nên ở chế độ “Đề xuất
  chính” bộ lọc được áp dụng trong bộ nhớ (xem `applyFiltersInMemory`).

## 5. Xem sau + hàng đợi phát

- `hooks/use-watch-later.ts` — lưu ở `localStorage["xemphim:watchLater"]`, tối đa
  100 mục. Đồng bộ giữa các component trong cùng tab bằng custom event
  `xemphim:watchLater:change` (sự kiện `storage` của trình duyệt chỉ bắn sang tab
  khác).
- `components/watch-later-panel.tsx` — danh sách hàng đợi, ẩn hoàn toàn khi trống.
- Nút “Phát tiếp” lấy mục đầu tiên trong hàng đợi khác video đang phát.

## 6. Chế độ rạp phim (theater)

Triển khai bằng cách bọc `FeaturedPlayer` trong một container mở rộng ngay tại
`hero-explorer.tsx`. **Không sửa** `components/featured-player.tsx` vì component
đó đang hoạt động đúng với mini-player sẵn có.

## Kiểm thử thủ công gợi ý

1. `npm run typecheck` và `npm run lint`.
2. Đổi theme sáng / tối / hệ thống, tải lại trang → không nháy màu.
3. Cuộn xuống cuối lưới → tự nạp thêm video, không trùng lặp.
4. Đổi bộ lọc → danh sách nạp lại từ đầu, `nextPageToken` reset.
5. Thêm vài video vào Xem sau → tải lại trang → hàng đợi vẫn còn.
6. Thu gọn sidebar → tải lại trang → vẫn thu gọn.
