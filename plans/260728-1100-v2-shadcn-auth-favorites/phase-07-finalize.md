---
phase: 7
title: Finalize
status: completed
priority: P2
dependencies:
  - 6
---

# Phase 7: Finalize

## Overview
Cập nhật README + architecture doc, chạy typecheck/build/lint, smoke test.

## Requirements
- README tiếng Việt có đủ hướng dẫn cấu hình Auth + Google + Prisma.
- `docs/architecture.md` cập nhật sơ đồ.

## Related Code Files
Modify: `README.md`, `docs/architecture.md`.

## Implementation Steps
1. Cập nhật README: `.env` keys, lệnh Prisma (`prisma migrate dev`, `prisma db seed`), cách đăng nhập demo.
2. Chạy typecheck/build/lint.
3. Smoke test `/api/videos?interests=...`, `/api/collections` (chưa auth), `/favorites` (redirect).

## Success Criteria
- [ ] README đầy đủ.
- [ ] Build pass.

## Risk Assessment
- Cảnh báo Prisma trên Windows: nếu gặp lỗi prisma binary, dùng `prisma generate --no-engine` hoặc `npx prisma db push --skip-generate`.
