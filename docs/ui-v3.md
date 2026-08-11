# Giao diện v3

Tài liệu cho đợt nâng cấp giao diện trên nhánh `feat/youtube-ui-v3`.

**Không thêm dependency npm nào** — `package.json` và `package-lock.json` giữ nguyên.

---

## 1. Điều hướng: mỗi breakpoint chỉ một nơi

Trước đây cùng một nhóm liên kết xuất hiện ở ba chỗ: header, sidebar và footer. Nay
được gom về một nguồn duy nhất và render đúng một lần trên mỗi kích thước màn hình.

| Thành phần | Mobile | Desktop (lg+) |
| --- | --- | --- |
| `components/site/mobile-nav.tsx` | thanh tab dưới đáy | ẩn |
| `components/site/app-sidebar.tsx` | ẩn | cột dọc, thu gọn được |
| `site-header.tsx` | chỉ logo + theme + tài khoản | như mobile |
| `site-footer.tsx` | chỉ thương hiệu + ghi chú bản quyền | như mobile |

`components/site/nav-items.ts` là nguồn duy nhất định nghĩa các mục điều hướng
(`PRIMARY_NAV`, `LIBRARY_NAV`, `ACCOUNT_NAV`, `MOBILE_NAV`). Thêm mục mới chỉ cần sửa file
này, cả hai thanh điều hướng tự cập nhật.

> **Lưu ý khi thêm mục vào `MOBILE_NAV`:** thanh dưới đáy được giới hạn 5 mục để vùng
> chạm không bị hẹp. Quá 5 mục nên chuyển sang menu "Thêm".

Drawer trượt cũ trên mobile đã bị bỏ: nó tốn hai lần chạm để tới bất kỳ trang nào.

---

## 2. Logo mới

`components/site/logo.tsx` xuất hai thành phần:

- `<Logo size={28} />` — riêng biểu tượng: khung màn hình bo tròn, nút play, hai cung
  sóng hai bên (ý niệm phát trực tuyến + khám phá).
- `<Wordmark hideTextOnMobile />` — biểu tượng kèm chữ, dùng ở header và footer.

`app/icon.svg` là phiên bản favicon. Next.js App Router tự nhận file này, không cần
khai báo thêm trong `metadata`.

Màu gradient trong SVG để cứng thay vì dùng CSS variable, để logo hiển thị giống nhau
ở cả hai theme và ở tab trình duyệt.

---

## 3. Tối ưu PC và mobile

- Lưới video giãn theo màn hình: 1 → 2 (sm) → 3 (xl) → 4 cột (2xl). Trước đây dừng ở
  3 cột nên màn hình rộng bị thừa nhiều khoảng trống.
- Thanh tab mobile tôn trọng `env(safe-area-inset-bottom)` để không bị thanh home của
  iPhone che. Khung trang có `pb-20 lg:pb-0` tương ứng.
- Nút "Xem sau" trên thẻ video **luôn hiện trên mobile**, chỉ ẩn–hiện theo hover từ `lg`
  trở lên. Màn hình cảm ứng không có trạng thái hover.
- Header dán ở `top-0` với padding ngoài, thay cho `top-3` cũ vốn để hở một dải nền khi
  cuộn trên màn hình nhỏ.
- Khoảng cách, cỡ chữ và padding chuyển sang thang responsive (`py-5 sm:py-8`,
  `text-3xl sm:text-5xl md:text-6xl`...).

---

## 4. Tính năng bổ sung

### Tìm kiếm gần đây
`hooks/use-recent-searches.ts` lưu tối đa 8 từ khoá vào `localStorage`. Danh sách hiện
khi đưa con trỏ vào ô tìm, xoá được từng mục hoặc toàn bộ. Trùng lặp được loại bỏ
không phân biệt hoa thường.

> Các nút trong danh sách dùng `onMouseDown` kèm `preventDefault`. Nếu chỉ dùng `onClick`,
> sự kiện `blur` của ô nhập sẽ đóng danh sách trước khi cú nhấp kịp đăng ký.

### Phím tắt
| Phím | Tác dụng |
| --- | --- |
| `/` | đưa con trỏ vào ô tìm kiếm |
| `T` | bật/tắt chế độ rạp phim |
| `Esc` | đóng gợi ý, thoát rạp phim, bỏ focus |

Trình xử lý bỏ qua khi người dùng đang gõ trong `input`, `textarea` hay vùng
`contenteditable`, và khi có kèm `Ctrl`/`Cmd`/`Alt`.

### Chế độ lưới / danh sách
Nút chuyển ở cạnh bộ lọc, lưu vào `localStorage`. Chế độ danh sách hiển thị thêm mô tả
video nên hợp khi cần lướt nhanh nhiều kết quả.

### Chia sẻ
Dùng `navigator.share` khi trình duyệt hỗ trợ (thường là mobile), nếu không thì sao chép
liên kết vào clipboard kèm thông báo toast. Người dùng đóng bảng chia sẻ cũng rơi về
nhánh sao chép.

### Lên đầu trang
`components/back-to-top.tsx` hiện sau khi cuộn qua 800px. Vị trí nằm trên thanh tab
mobile (`bottom-24 lg:bottom-6`) để không chồng lên nhau.

---

## 5. Các đợt trước trên cùng nhánh

- **Light/Dark mode** — `components/theme/`, script chạy trước paint trong `app/layout.tsx`
  để tránh nháy màu.
- **Infinite scroll** — `lib/youtube-search.ts` trả `nextPageToken`; `IntersectionObserver`
  với `rootMargin: 600px`, lọc trùng theo `id`.
- **Bộ lọc nâng cao** — `lib/filters.ts` + `components/video-filters.tsx`. Endpoint
  `chart=mostPopular` không nhận tham số lọc nên chế độ đề xuất lọc trong bộ nhớ.
- **Xem sau** — `hooks/use-watch-later.ts`, đồng bộ trong cùng tab bằng custom event.

---

## Kiểm thử

```bash
npm run typecheck
npm run lint
npm run dev
```

1. Thu nhỏ cửa sổ dưới 1024px → sidebar biến mất, thanh tab dưới đáy xuất hiện; không
   còn liên kết điều hướng nào lặp lại trên màn hình.
2. Nhấn `/` → con trỏ nhảy vào ô tìm. Nhấn `T` → vào/ra chế độ rạp phim.
3. Tìm vài từ khoá → tải lại trang → danh sách gần đây vẫn còn.
4. Đổi sang chế độ danh sách → tải lại trang → vẫn giữ chế độ đó.
5. Kiểm tra favicon mới ở tab trình duyệt (có thể cần xoá cache).
6. Trên iPhone: thanh tab không bị thanh home che, footer không bị khuất.

> Cần `YOUTUBE_API_KEY` trong `.env.local` để chạy thử.
