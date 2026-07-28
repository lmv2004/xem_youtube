---
phase: 3
title: Database
status: completed
priority: P1
dependencies:
  - 2
---

# Phase 3: Database

## Overview
Thêm Prisma + SQLite. Schema gồm User, Account, Session (Auth.js chuẩn), VerificationToken, Interest, Collection, CollectionItem, ViewHistory.

## Requirements
- Email-password với bcrypt hash; OAuth account linking.
- Quan hệ: User 1-N Collection 1-N CollectionItem.
- ViewHistory lưu id video + topic + createdAt để gợi ý "xem gần đây".

## Related Code Files
Create: `prisma/schema.prisma`, `prisma/seed.ts`, `lib/db.ts`, `.env.example` (bổ sung DATABASE_URL).

## Implementation Steps
1. Khởi tạo `npx prisma init --datasource-provider sqlite`.
2. Định nghĩa schema.
3. `npx prisma migrate dev --name init`.
4. `lib/db.ts` export `prisma` singleton (tránh hot-reload khởi tạo nhiều).
5. Seed: 1 user demo, interests mặc định, 1 collection "Yêu thích".

## Success Criteria
- [ ] `prisma db push` thành công.
- [ ] Seed tạo user demo đăng nhập được.

## Risk Assessment
- SQLite phục vụ dev; production sẽ chuyển Postgres (ghi vào docs).
