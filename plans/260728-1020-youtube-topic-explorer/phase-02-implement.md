---
phase: 2
title: Implement
status: completed
priority: P1
dependencies:
  - 1
---

# Phase 2: Implement

## Overview
Scaffold dự án Next.js App Router, viết route server, components UI tiếng Việt responsive, và hỗ trợ trạng thái loading/error.

## Requirements
- Functional: chọn chủ đề (chip + input), gọi API, hiển thị featured embed và danh sách đề xuất.
- Non-functional: SSR/CSR tuỳ ngữ cảnh; responsive mobile-first; giao diện tiếng Việt; không lộ API key.

## Architecture
- `app/page.tsx` (server component) chứa state page cơ bản và render `TopicExplorer` (client) cho form.
- `app/api/videos/route.ts` Next.js route handler: validate query, gọi YouTube Data API v3 qua `fetch` với `revalidate=300` cache hint, chuẩn hoá dữ liệu.
- `lib/youtube.ts` helper fetch/normalize, dùng `YOUTUBE_API_KEY` server-only.
- `components/topic-explorer.tsx` (client) quản lý form, loading, error, results.
- `components/video-card.tsx` và `components/featured-player.tsx` cho UI.

## Related Code Files
Create:
- `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `.gitignore`, `.env.example`.
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.
- `app/api/videos/route.ts`.
- `lib/youtube.ts`, `lib/types.ts`, `lib/topics.ts`.
- `components/topic-explorer.tsx`, `components/featured-player.tsx`, `components/video-card.tsx`, `components/status.tsx`.
- `README.md`.

## Implementation Steps
1. `npx create-next-app@latest` với App Router, TypeScript, ESLint, Tailwind, src-dir off (đặt trong root), alias `@/*`.
2. Tạo `.env.example` với `YOUTUBE_API_KEY=`; `.gitignore` loại trừ `.env.local`.
3. Cài thêm `clsx` (tuỳ chọn) — không thêm dependency ngoài Next/React/Tailwind nếu không cần.
4. `lib/types.ts` định nghĩa `VideoItem`, `VideoSearchResponse`.
5. `lib/youtube.ts` viết `searchVideos(topic)` gọi `search.list` rồi `videos.list`, sort theo viewCount giảm dần khi quota còn; throws errors với mã ổn định.
6. `lib/topics.ts` cung cấp 6 chủ đề gợi ý tiếng Việt.
7. `app/api/videos/route.ts` export `GET` handler validate `topic` (1-100 ký tự), trả JSON `{ items, featuredId, error? }` với status code rõ ràng.
8. `components/topic-explorer.tsx` dùng `useState` cho topic, fetch, xử lý trạng thái `idle|loading|ready|empty|error|missing-key`.
9. `components/featured-player.tsx` nhúng `https://www.youtube.com/embed/{id}` với `loading=lazy`, `playsinline=1`, `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"`.
10. `components/video-card.tsx` thumbnail 16:9, tiêu đề, kênh, viewCount đã format.
11. `components/status.tsx` cho loading skeleton, empty, error, missing-key.
12. `app/globals.css` theme Tailwind tiếng Việt, focus-visible, reduced-motion.
13. `app/layout.tsx` `<html lang="vi">`, metadata tiếng Việt.
14. `README.md` hướng dẫn `YOUTUBE_API_KEY` và lệnh chạy.

## Success Criteria
- [ ] `npm run build` không lỗi.
- [ ] Giao diện tiếng Việt responsive từ 360px trở lên.
- [ ] API key không xuất hiện trong client bundle (grep `YOUTUBE_API_KEY` trong `.next/static`).
- [ ] Loading/empty/error/missing-key đều hiển thị đúng.

## Risk Assessment
- Quota YouTube hết: hiển thị thông báo thân thiện, không dùng mock data.
- Network timeout: thiết lập `AbortController` với timeout 8s; UI fallback lỗi có retry.
- YouTube thay đổi schema: chỉ đọc fields tối thiểu, validate ở client trước khi render.
