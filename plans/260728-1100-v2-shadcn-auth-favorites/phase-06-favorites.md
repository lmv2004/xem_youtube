---
phase: 6
title: Favorites
status: completed
priority: P1
dependencies:
  - 5
---

# Phase 6: Favorites

## Overview
Trang `/favorites` cho phép tạo nhiều collection, thêm/xoá video, xem embedded player; trang `/history` liệt kê video đã xem.

## Requirements
- CRUD collections (tạo, đổi tên, xoá).
- Thêm/xoá video trong collection.
- Drag/drop không cần (YAGNI).
- Hiển thị empty state.

## Related Code Files
Create: `app/favorites/page.tsx`, `app/favorites/[id]/page.tsx`, `app/history/page.tsx`, `lib/actions/collections.ts`, `lib/actions/history.ts`, `app/api/collections/route.ts`, `app/api/collections/[id]/route.ts`, `app/api/collections/[id]/items/route.ts`, `app/api/collections/[id]/items/[videoId]/route.ts`.
Create: `components/collection-card.tsx`, `components/collection-form.tsx`, `components/collection-items.tsx`.

## Implementation Steps
1. Server actions cho CRUD (an toàn với revalidatePath).
2. Trang list hiển thị các collection; trang detail hiển thị video grid + nút play.
3. Trang history đọc `ViewHistory` theo user.
4. Empty state dùng Card + Button.

## Success Criteria
- [ ] Tạo collection mới → reload thấy ngay.
- [ ] Thêm video → đếm số lượng tăng.
- [ ] Xoá video → cập nhật UI.

## Risk Assessment
- Reordering không hỗ trợ; tránh scope creep.
