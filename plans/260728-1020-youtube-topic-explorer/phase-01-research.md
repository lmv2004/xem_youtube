---
phase: 1
title: Research
status: completed
priority: P1
dependencies: []
---

# Phase 1: Research

## Overview
Xác nhận cấu trúc Next.js mới nhất, hợp đồng YouTube Data API v3 cần dùng và các giới hạn triển khai để làm MVP nhỏ, an toàn.

## Requirements
- Functional: search theo chủ đề; lấy metadata video và thống kê cần thiết.
- Non-functional: API key chỉ ở server; không gọi YouTube trực tiếp từ client; xử lý quota/network/API errors.

## Architecture
Client gọi `GET /api/videos?topic=...`. Route server đọc `YOUTUBE_API_KEY`, gọi `search.list` để lấy video IDs/metadata, gọi `videos.list` để lấy statistics, chuẩn hóa response. UI chọn video đầu tiên làm featured embed.

## Related Code Files
- Read: `README.md` (hiện chưa tồn tại), `package.json` sau scaffold.
- Reference: Next.js App Router docs; YouTube Data API v3 docs.

## Implementation Steps
1. Xác nhận CLI `create-next-app` và phiên bản stable hiện tại.
2. Chọn fields tối thiểu: `search.list(part=snippet,type=video,order=relevance,maxResults=12,q=topic)` và `videos.list(part=statistics,snippet,id=...)`.
3. Xác định normalization schema và trạng thái UI.
4. Ghi nhận quota/caching/rate-limit assumptions trong plan.

## Success Criteria
- [ ] API contract và file boundaries rõ ràng.
- [ ] Không có dependency không cần thiết.
- [ ] Security/configuration risks có mitigation.

## Risk Assessment
YouTube quota hoặc key thiếu có thể làm search thất bại; route phải trả lỗi có mã ổn định và UI hiển thị hướng dẫn. Không dùng dữ liệu giả làm fallback.
