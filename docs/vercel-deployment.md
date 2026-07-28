# Triển khai Vercel + CI/CD

Hướng dẫn từng bước để đẩy XemPhimYouTube lên Vercel với database Postgres
(Neon free tier) + auto-deploy khi push lên `main`.

## Kiến trúc

```
GitHub (main branch)
   │  push
   ▼
GitHub Actions (.github/workflows/ci.yml)
   │  typecheck + build + lint
   ▼
Vercel (auto import qua GitHub App)
   │  build = "prisma generate && next build"
   ▼
Vercel Functions
   │
   ├── Neon Postgres (free tier)
   ├── YouTube Data API v3
   └── Auth.js (AUTH_SECRET)
```

## 1. Tạo Neon Postgres

1. Vào https://console.neon.tech → đăng ký (free).
2. **New project** → chọn region gần Vercel (Singapore `sin1`).
3. Lấy `DATABASE_URL` (đoạn có `?sslmode=require` ở cuối).
4. Tạo 2 branch: `main` (production) + `dev` (local dev). Mỗi branch có `DATABASE_URL` riêng.

## 2. Tạo GitHub repo

```bash
cd "C:/Users/vuonglm/workspace/XemPhimYoutube"
git init
git add .
git commit -m "feat: v2 with shadcn + auth + favorites"
# Tạo repo trên GitHub (https://github.com/new), đặt tên xemphim-youtube
git remote add origin https://github.com/<USER>/xemphim-youtube.git
git push -u origin main
```

## 3. Cấu hình Vercel

1. Vào https://vercel.com → **Add New Project** → chọn repo GitHub vừa push.
2. Framework preset: **Next.js** (Vercel tự nhận).
3. **Environment Variables** — thêm:

   | Key                 | Value                                                | Env       |
   | ------------------- | ---------------------------------------------------- | --------- |
   | `DATABASE_URL`      | URL Neon production branch (`?sslmode=require`)      | Production + Preview |
   | `AUTH_SECRET`       | `openssl rand -base64 32`                            | Production + Preview |
   | `AUTH_URL`          | `https://<project>.vercel.app`                        | Production |
   | `YOUTUBE_API_KEY`   | `AIza...`                                            | Production + Preview |
   | `AUTH_GOOGLE_ID`    | (tuỳ chọn)                                           | Production + Preview |
   | `AUTH_GOOGLE_SECRET` | (tuỳ chọn)                                           | Production + Preview |

4. **Deploy**. Vercel sẽ chạy `prisma generate && next build` theo `vercel.json`.
5. Sau khi deploy xong, vào **Project Settings → Functions → DATABASE_URL** đã set chưa.

## 4. Migrate database production

Vercel không chạy migration tự động. Cách 1 (khuyến nghị):

```bash
# Lấy DATABASE_URL production từ Vercel dashboard, paste vào terminal
export DATABASE_URL="postgresql://...neon.../..."
npm run prisma:push       # đồng bộ schema
npm run prisma:seed       # tạo user demo
```

> Hoặc dùng Vercel CLI: `vercel env pull .env.local && npm run prisma:push && npm run prisma:seed`

## 5. CI

Mỗi push lên `main` hoặc PR sẽ chạy `.github/workflows/ci.yml`:
- npm ci
- prisma generate
- typecheck
- lint
- build

Nếu CI fail → Vercel không nhận được build "passed" cho main (tuy vẫn auto-deploy,
nhưng bạn biết có lỗi).

## 6. Auto-deploy

Vercel GitHub App auto-deploy:
- Push `main` → production (URL `https://<project>.vercel.app`)
- Mỗi PR → preview URL riêng

## 7. Logger

- Local: ghi `logs/YYYY-MM-DD.log` (rolling UTC).
- Vercel: filesystem read-only, không có `logs/`. `lib/logger.ts` tự fallback ghi
  qua `console.*` — Vercel capture vào **Functions → Logs**.

Xem log:

```bash
vercel logs https://<project>.vercel.app --follow
# Hoặc Vercel dashboard → Deployments → chọn build → Logs
```

## 8. Domain tùy chỉnh (tuỳ chọn)

Vercel → Project → **Settings → Domains** → thêm `xemphim.yourdomain.com`. Tự động
có HTTPS. Cập nhật `AUTH_URL` cho khớp.

## 9. Checklist trước khi deploy

- [ ] `.env` (cho Prisma CLI) đã set `DATABASE_URL` Postgres
- [ ] `.env.local` không commit (đã `.gitignore`)
- [ ] `AUTH_SECRET` mới (không dùng secret dev)
- [ ] `YOUTUBE_API_KEY` còn quota
- [ ] Trong Vercel: `DATABASE_URL` trỏ đến nhánh Neon production
- [ ] `npm run prisma:push && npm run prisma:seed` đã chạy với DATABASE_URL production

## 10. Hạn chế

- **Vercel serverless = cold start ~1-2s** cho request đầu tiên. Có thể giảm bằng
  Vercel Pro/Edge.
- **Quota YouTube 10.000/ngày** — chia sẻ cùng quota giữa dev và prod.
- **Mỗi lần deploy là cold start**, có thể chậm 1 request đầu.
- **Database connection**: dùng Neon pooler URL (port 5432) + `?sslmode=require&pgbouncer=true`
  để tránh quá tải connection pool.
