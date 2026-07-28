---
phase: 3
title: Test
status: completed
priority: P2
dependencies:
  - 2
---

# Phase 3: Test

## Overview
Xác minh hành vi runtime bằng typecheck, build, smoke test route handler, và kiểm tra responsive.

## Requirements
- Functional: mỗi endpoint/state đều có thể kiểm chứng.
- Non-functional: phát hiện sớm regression.

## Architecture
Thực hiện các lệnh dưới đây sau khi scaffold xong. Tận dụng Next.js built-in lint và typecheck; smoke test bằng `node --test` cho `lib/youtube.ts` nếu viết được.

## Related Code Files
- Modify: `app/api/videos/route.ts`, `lib/youtube.ts` (test seam).
- Create: `tests/youtube.test.mjs` chạy `node --test`.

## Implementation Steps
1. `npx tsc --noEmit` đảm bảo type check sạch.
2. `npx next build` thành công.
3. `npx next lint` (hoặc eslint) sạch.
4. Smoke test: chạy `npx next dev` nền, gọi `GET /api/videos?topic=` (400), `?topic=abc` (200 nếu key có; 503 nếu thiếu key).
5. Unit test hàm `formatViews` và `parseYouTubeError` nếu đã viết.
6. Verify `YOUTUBE_API_KEY` không xuất hiện trong `.next/static` (`grep -r YOUTUBE_API_KEY .next/static || true`).
7. Manual visual test ở viewport 360px và 1280px.

## Success Criteria
- [ ] Typecheck/build/lint pass.
- [ ] API trả 400 với topic rỗng; 503 khi key thiếu.
- [ ] API key không lộ trong bundle.

## Risk Assessment
- Build chậm nếu linter quét toàn bộ; giới hạn scope. Không chạy test Playwright nặng trong MVP.
