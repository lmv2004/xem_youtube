# Kiến trúc XemPhimYouTube v2

## Tổng quan

Next.js App Router + TypeScript, giao diện dark mode dùng shadcn/ui. Logic gọi YouTube
Data API v3 chạy hoàn toàn phía server. User auth qua Auth.js v5 với JWT session, lưu DB
qua Prisma + SQLite. Dữ liệu cá nhân (danh sách yêu thích, lịch sử) đều gắn với `userId`.

## Luồng dữ liệu

```
┌────────┐ fetch /api/videos?topic=...&interests=...     ┌──────────────────────┐
│ Client │ ────────────────────────────────────────────► │  /api/videos         │
│ (RSC + │ ◄──────────── JSON: { items, featuredId } ─── │  (route handler)     │
│  CC)   │                                              │  - validate          │
└────────┘                                              │  - searchVideos()    │
                                                         │  - personalize()     │
┌────────┐ fetch /api/collections                       │  - sort by score     │
│ Header │ ────────────►                                 └──────────┬───────────┘
│ Avatar │                                                         │
│ Menu   │                                              ┌──────────▼───────────┐
└────────┘                                              │ YouTube Data API v3  │
                                                         │ search.list +        │
┌────────┐ POST /api/auth/register                      │ videos.list          │
│ Form   │ ────────────►  bcrypt.hash → user.create     └──────────────────────┘
└────────┘
                                                         ┌──────────────────────┐
┌────────┐ POST /api/collections/[id]/items              │  Prisma + SQLite     │
│ Add to │ ────────────►  collectionItem.upsert          │  (file:dev.db)       │
│ sheet  │                                              │                      │
└────────┘                                              └──────────────────────┘
```

## Cấu trúc schema (Prisma)

- `User` ↔ `Account` / `Session` (chuẩn Auth.js, JWT, không dùng session DB)
- `Collection` (User 1-N) ↔ `CollectionItem` (Collection 1-N)
- `ViewHistory` (User 1-N) – lưu 50 video gần nhất

## Middleware bảo vệ route

`middleware.ts` sử dụng `authConfig` (edge-safe, không có Prisma). Khi người dùng chưa đăng
nhập truy cập `/favorites`, `/history`, `/account` thì middleware redirect sang `/login?callbackUrl=…`.

## Cá nhân hoá (heuristic)

`/api/videos` nhận `interests` (CSV, tối đa 4) + `topic` (tuỳ chọn). Khi có `interests`:

1. Tạo query `interests[0] | interests[1] | ... | topic` (OR).
2. Gọi `searchVideos` lấy danh sách video.
3. `personalize()` cộng điểm: `viewCount + 50_000` cho mỗi interest xuất hiện trong `title|channel`.
4. Sắp xếp lại theo điểm giảm dần.

Lưu `interests` ở localStorage (`xemphim:interests`); lần đầu vào trang chủ sẽ hydrate và tự chạy.

## Bảo mật

- API key chỉ đọc trong `lib/youtube.ts` (file `import "server-only"`).
- Route handler chạy `runtime = "nodejs"`, không dùng Edge.
- `bcrypt` hash với cost 10. Không log password.
- Validation input bằng `zod` ở mọi endpoint.

## Tối ưu hoá

- Iframe `loading="lazy"`, thumbnail `loading="lazy"`.
- Iframe `autoplay=1` chỉ khi user bấm "Phát ngay" (tránh chi phí ban đầu).
- Lịch sử chỉ ghi 1 lần khi user thực sự phát (không ghi khi mở trang).
- Bundle Tailwind purge giữ kích thước nhỏ (~103 kB shared JS).
