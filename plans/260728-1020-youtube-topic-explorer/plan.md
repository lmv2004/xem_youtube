---
title: Vietnamese YouTube Trending Explorer
description: >-
  Ứng dụng Next.js App Router bằng tiếng Việt để chọn chủ đề, tìm video YouTube
  liên quan qua API server-side, xếp hạng video xu hướng và nhúng video.
status: completed
priority: P1
branch: ''
tags:
  - nextjs
  - youtube
  - vietnamese-ui
blockedBy: []
blocks: []
created: '2026-07-28T03:21:59.562Z'
createdBy: 'ck:plan'
source: skill
---

# Vietnamese YouTube Trending Explorer

## Overview

Khởi tạo một ứng dụng Next.js phiên bản mới nhất với App Router, TypeScript và giao diện tiếng Việt. Người dùng chọn hoặc nhập chủ đề; trình duyệt gọi route server-side để tìm video qua YouTube Data API v3, dữ liệu được sắp xếp theo mức độ liên quan/xu hướng, sau đó hiển thị video nổi bật bằng YouTube embed và danh sách đề xuất responsive.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Research](./phase-01-research.md) | Completed |
| 2 | [Implement](./phase-02-implement.md) | Completed |
| 3 | [Test](./phase-03-test.md) | Completed |
| 4 | [Review](./phase-04-review.md) | Completed |
| 5 | [Docs](./phase-05-docs.md) | Completed |

## Dependencies

- YouTube Data API v3 key supplied by deployer via `YOUTUBE_API_KEY`; app remains usable with a clear configuration error when absent.
- No database or authentication in MVP.

## Acceptance Criteria

- [ ] New Next.js app installs and builds successfully.
- [ ] Vietnamese responsive UI presents topic chips/input and search action.
- [ ] API key never reaches browser/client bundle.
- [ ] Search route validates topic, handles quota/API/network errors, and returns normalized video data.
- [ ] Results include one highlighted embedded YouTube video plus related recommendation cards.
- [ ] Loading, empty, error, and API-not-configured states are visible and actionable.
- [ ] README documents setup, environment variable configuration, and run/build commands.
