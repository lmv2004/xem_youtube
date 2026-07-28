---
title: XemPhimYouTube v2 (shadcn + auth + favorites)
description: >-
  Nâng cấp lên shadcn/ui dark mode, thêm Prisma + SQLite, Auth.js (Credentials +
  Google) và trang /favorites quản lý nhiều collection.
status: completed
priority: P1
branch: ''
tags:
  - nextjs
  - shadcn
  - prisma
  - authjs
  - youtube
  - vietnamese-ui
  - dark-mode
blockedBy: []
blocks: []
created: '2026-07-28T03:48:27.936Z'
createdBy: 'ck:plan'
source: skill
---

# XemPhimYouTube v2 (shadcn + auth + favorites)

## Overview

Phát triển tiếp từ v1: thêm shadcn/ui (dark mode), Prisma + SQLite, Auth.js v5 (Credentials + Google OAuth) và trang `/favorites` cho phép tạo nhiều danh sách yêu thích. Mục tiêu cốt lõi: **đề xuất video phù hợp sở thích** (chọn nhiều interests → route server OR các từ khoá + sort heuristic ưu tiên khớp kênh/keyword + viewCount).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Bootstrap](./phase-01-bootstrap.md) | Completed |
| 2 | [Shadcn](./phase-02-shadcn.md) | Completed |
| 3 | [Database](./phase-03-database.md) | Completed |
| 4 | [Auth](./phase-04-auth.md) | Completed |
| 5 | [UI](./phase-05-ui.md) | Completed |
| 6 | [Favorites](./phase-06-favorites.md) | Completed |
| 7 | [Finalize](./phase-07-finalize.md) | Completed |

## Dependencies

- Giữ nguyên `YOUTUBE_API_KEY` (server-side).
- Auth.js yêu cầu `AUTH_SECRET`; Google OAuth cần `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` (optional nhưng bạn đã chọn cả 2).
- `NEXTAUTH_URL` cho callback URL khi cần.

## Acceptance Criteria

- [ ] Giao diện dark mode, dùng shadcn components (Button, Card, Input, Tabs, Dialog, Sheet, Skeleton, Badge, Avatar, DropdownMenu, Toast, Form).
- [ ] Đăng ký / đăng nhập bằng email-password và Google; session bằng JWT.
- [ ] Trang `/` cho chọn nhiều sở thích (chip), nhập từ khoá, hiển thị đề xuất cá nhân hoá.
- [ ] Trang `/favorites`: tạo/đổi tên/xoá collection, thêm/xoá video, xem embedded player.
- [ ] API CRUD `/api/collections` + `/api/collections/[id]/items` chỉ dành cho user đã đăng nhập.
- [ ] Trang `/history` xem các video đã xem gần đây.
- [ ] Top navigation hiển thị avatar + menu khi đăng nhập.
- [ ] Database seed tạo 1 user demo (email `demo@xemphim.local`, password `Demo1234!`) + 1 collection "Yêu thích".
- [ ] Typecheck/build/lint pass; smoke test API.
