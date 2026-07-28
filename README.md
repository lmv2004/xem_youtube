# XemPhimYouTube

Trang web Next.js bằng **tiếng Việt** giúp bạn chọn nhiều sở thích, tự động tìm và đề xuất
video YouTube xu hướng, đồng thời **lưu video yêu thích vào nhiều danh sách cá nhân**.

Phiên bản này (v2) dùng shadcn/ui (dark mode), Prisma + SQLite, Auth.js v5 với email/mật khẩu
và Google OAuth. Khoá YouTube vẫn chỉ nằm phía server, không bao giờ lọt vào bundle trình duyệt.

## Tính năng

- **Giao diện dark mode** dùng shadcn/ui (button, card, input, tabs, dialog, sheet, skeleton, badge, avatar, dropdown-menu, separator, toast, tooltip, form, textarea).
- **Chọn nhiều sở thích** (chip) + nhập từ khoá tuỳ ý; hệ thống OR các từ khoá rồi xếp hạng cá nhân hoá theo điểm khớp + viewCount.
- **Đăng ký / đăng nhập** bằng email + mật khẩu (bcrypt) hoặc Google OAuth (nếu cấu hình).
- **Nhiều danh sách yêu thích**: tạo, đổi tên, xoá; thêm / bỏ video trong danh sách.
- **Lịch sử xem** tự ghi lại khi bạn phát một video (nếu đã đăng nhập).
- **YouTube Data API v3** chạy phía server (`runtime = "nodejs"`), validate input, có state machine cho idle/loading/ready/empty/error/missing-key.
- **Bảo mật**: API key đọc từ `process.env.YOUTUBE_API_KEY`; middleware bảo vệ `/favorites`, `/history`, `/account`.

## Yêu cầu

- Node.js 20.x trở lên (đã thử với Node 22).
- npm 10.x trở lên.
- Một khoá **YouTube Data API v3** (xem phần dưới).
- *(Tuỳ chọn)* Một dự án Google Cloud đã bật OAuth Web credentials nếu muốn đăng nhập bằng Google.

## Cài đặt

```bash
npm install
cp .env.example .env.local
# Sửa .env.local: dán YOUTUBE_API_KEY=AIza..., AUTH_SECRET=...
npx prisma db push
npm run prisma:seed
npm run dev
```

Mở http://localhost:3000 và đăng nhập bằng tài khoản demo:

- Email: `demo@xemphim.local`
- Mật khẩu: `Demo1234!`

## Logging

Mọi API route được bọc bởi `withRequestLog` (`lib/api-route.ts`) ghi log ra
`logs/YYYY-MM-DD.log` (rolling theo UTC). Mỗi request đều có:

- `scope` (vd `api:collections.items.add`)
- method, path, query, status, durationMs
- userId (nếu đã đăng nhập)
- payload đã validate (khi Zod fail), error message…

Client cũng gửi log về `/api/client-log` thông qua `reportClientError` (mọi
`add-to-collection` flow) và `ClientLogInit` (window.onerror /
unhandledrejection). Mọi log client được ghi cùng file với cú pháp
`scope: "client:..."` nên dễ lọc:

```bash
# Xem mọi lỗi gần đây
tail -n 200 logs/$(date -u +%Y-%m-%d).log | jq -r 'select(.level=="error" or .level=="warn")'

# Filter theo scope
grep 'api:collections.items.add' logs/2026-07-28.log
```

Biến `LOG_LEVEL` (mặc định `info`) để chỉnh: `debug|info|warn|error`.

## Cấu hình biến môi trường

| Biến                 | Bắt buộc | Mô tả                                                                |
| -------------------- | -------- | --------------------------------------------------------------------- |
| `YOUTUBE_API_KEY`    | Có       | Khoá YouTube Data API v3. Server-only.                                |
| `DATABASE_URL`       | Có       | Chuỗi kết nối Prisma. Mặc định `file:./prisma/dev.db`.                |
| `AUTH_SECRET`        | Có       | Random 32 byte, dùng cho JWT session. Tạo bằng `openssl rand -base64 32`. |
| `AUTH_URL`           | Tuỳ      | URL gốc khi triển khai (vd `https://xemphim.vercel.app`).             |
| `AUTH_GOOGLE_ID`     | Tuỳ      | OAuth Client ID nếu muốn đăng nhập Google.                            |
| `AUTH_GOOGLE_SECRET` | Tuỳ      | OAuth Client Secret.                                                  |

> File `.env` chỉ chứa `DATABASE_URL` để Prisma CLI hoạt động. `.env.local` chứa secrets và
> đã được `.gitignore` loại trừ. Không commit bất kỳ file `.env*` nào.

## Scripts

| Lệnh                    | Mục đích                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| `npm run dev`           | Chạy dev server.                                                 |
| `npm run build`         | Build production.                                                |
| `npm run start`         | Chạy app production.                                             |
| `npm run lint`          | ESLint theo cấu hình `next/core-web-vitals`.                     |
| `npm run typecheck`     | `tsc --noEmit`.                                                  |
| `npm run prisma:generate` | Generate Prisma client.                                         |
| `npm run prisma:migrate`  | `prisma migrate dev` (tạo migration khi đổi schema).            |
| `npm run prisma:push`   | `prisma db push` (sync schema nhanh, không tạo migration).       |
| `npm run prisma:seed`   | Chạy `prisma/seed.ts` (tạo user demo).                           |

## Cấu trúc thư mục

```
app/
  layout.tsx                 # html lang="vi" + SessionProvider + Toaster
  page.tsx                   # Trang chủ
  globals.css                # Tailwind + dark tokens
  (auth)/login, register/    # Trang đăng nhập/đăng ký
  account/                   # Trang tài khoản
  favorites/, favorites/[id]/# Quản lý danh sách
  history/                   # Lịch sử xem
  api/
    auth/[...nextauth]/      # Auth.js handlers
    auth/register/           # POST đăng ký
    videos/                  # GET search + đề xuất
    collections/, collections/[id]/, ...   # CRUD yêu thích
    history/                 # GET/POST lịch sử
auth.ts, auth.config.ts      # Cấu hình Auth.js
middleware.ts                # Bảo vệ route
components/
  ui/                        # shadcn primitives
  site/site-header, site-footer
  auth/                      # login, register, sign-out
  explorer.tsx               # Trang chủ chính
  interest-picker.tsx        # Chọn sở thích
  featured-player.tsx        # Iframe embed + ghi lịch sử
  video-grid.tsx             # Lưới card
  add-to-collection-dialog.tsx
  collection-manager.tsx
  history-list.tsx
  new-collection-form.tsx
lib/
  youtube.ts                 # Server-only YouTube helper
  format.ts                  # formatViews, formatDuration
  time.ts                    # formatDistanceToNow (vi)
  utils.ts                   # cn, slugify, videoItemToRecord
  types.ts, topics.ts, db.ts
prisma/
  schema.prisma, seed.ts
hooks/
  use-toast.ts
docs/
  architecture.md
```

## Hạn chế đã biết

- Quota YouTube mặc định 10.000 đơn vị/ngày. Mỗi lần tìm kiếm tiêu tố 2 đơn vị.
  Lên kế hoạch cache nếu dùng cho nhiều user.
- SQLite phục vụ dev. Production nên chuyển sang Postgres (đổi `provider` trong `prisma/schema.prisma`).
- Trang `/favorites` yêu cầu đăng nhập (middleware redirect sang `/login`).

## Triển khai Vercel (CI/CD)

Xem hướng dẫn đầy đủ tại [docs/vercel-deployment.md](docs/vercel-deployment.md).

Tóm tắt:

1. Tạo Neon Postgres free tier → lấy `DATABASE_URL`.
2. Push code lên GitHub.
3. Vercel → Import repo → set env (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `YOUTUBE_API_KEY`).
4. Mỗi push main → GitHub Actions chạy CI + Vercel auto-deploy.
5. `npm run prisma:push && npm run prisma:seed` với DATABASE_URL production.

## Chia sẻ nội bộ (LAN)

Cho đồng nghiệp cùng subnet công ty truy cập qua IP LAN. Xem hướng dẫn chi tiết
tại [docs/lan-deployment.md](docs/lan-deployment.md).

Tóm tắt:

```bash
# Trên máy bạn
ipconfig                        # lấy IP, vd 192.168.1.191
# Sửa .env.local: AUTH_URL=http://192.168.1.191:3000
npm run dev:lan                 # bind 0.0.0.0:3000
```

Đồng nghiệp mở `http://192.168.1.191:3000` và đăng nhập bằng tài khoản demo
(`demo@xemphim.local` / `Demo1234!`). Nếu không truy cập được, mở port 3000 trong
Windows Firewall (xem docs).

## Cấu hình Google OAuth (tuỳ chọn)

1. Vào Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application).
2. Authorized redirect URI: `<AUTH_URL>/api/auth/callback/google`.
3. Dán `AUTH_GOOGLE_ID` và `AUTH_GOOGLE_SECRET` vào `.env.local`.
4. Khởi động lại `npm run dev`.
# xem_youtube
