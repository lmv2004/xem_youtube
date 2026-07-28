---
phase: 5
title: UI
status: completed
priority: P1
dependencies:
  - 4
---

# Phase 5: UI

## Overview
Viết lại trang `/` với shadcn: header (logo, nav, user menu), hero (chọn interests), search bar, danh sách đề xuất, footer.

## Requirements
- Cá nhân hoá: chọn nhiều interests; gọi API `/api/videos?interests=a,b` (OR từ khoá + sort heuristic).
- Skeleton loading.
- Toast khi thêm/xoá favorite.

## Related Code Files
Modify: `app/page.tsx`, `app/layout.tsx`, `components/topic-explorer.tsx`, `components/featured-player.tsx`, `components/video-card.tsx`, `components/status.tsx`.
Create: `components/site-header.tsx`, `components/interest-picker.tsx`, `components/site-footer.tsx`, `components/recommendations.tsx`.
Modify: `app/api/videos/route.ts` để nhận `interests` + `topic`.

## Implementation Steps
1. `SiteHeader` chứa logo, nav (Trang chủ, Yêu thích, Lịch sử), user menu.
2. `InterestPicker` chọn nhiều chip; lưu trong localStorage + gửi lên API.
3. `Recommendations` gọi API, render `FeaturedPlayer` + `VideoCard` với nút "Lưu vào..." mở Sheet chọn collection.
4. Cập nhật route API: hỗ trợ `interests` (CSV) + `topic` (tuỳ chọn), kết hợp và sort.
5. Ghi log `ViewHistory` sau khi mở player.

## Success Criteria
- [ ] Trang chủ render đẹp dark mode.
- [ ] Đề xuất phản ánh interests đã chọn.
- [ ] Lịch sử xem cập nhật sau khi bấm play.

## Risk Assessment
- Quota: tối đa 4 interests + 1 topic tự do để tránh nổ quota.
