---
phase: 5
title: Docs
status: completed
priority: P2
dependencies:
  - 4
---

# Phase 5: Docs

## Overview
Hoàn thiện `README.md` và tài liệu ngắn gọn trong `docs/` để người dùng mới có thể clone, cấu hình, chạy trong 5 phút.

## Requirements
- Functional: hướng dẫn từng bước.
- Non-functional: dùng tiếng Việt, có cả tiếng Anh tối thiểu cho lệnh CLI.

## Architecture
Tạo một README self-contained, bổ sung `docs/architecture.md` ngắn gọn mô tả luồng dữ liệu.

## Related Code Files
- Create: `docs/architecture.md`, `docs/development-rules.md` (nếu repo chưa có rule file).
- Modify: `README.md`.

## Implementation Steps
1. `README.md` gồm: giới thiệu, điều kiện (Node 20+), cài đặt, biến môi trường (`YOUTUBE_API_KEY`), scripts (`dev`/`build`/`start`/`lint`), cấu trúc thư mục, hạn chế.
2. `docs/architecture.md` mô tả sơ đồ luồng: client → `/api/videos` → YouTube Data API → UI.
3. Ghi chú quota và rate-limit.
4. Tóm tắt trạng thái UI (idle/loading/ready/empty/error/missing-key).

## Success Criteria
- [ ] Người mới có thể chạy dev server và thấy UI mà không cần hỏi thêm.
- [ ] Tài liệu phản ánh đúng code.

## Risk Assessment
- Sai thông tin cấu hình gây lỗi: chạy `npm run build` sau khi viết để xác nhận lệnh vẫn đúng.
