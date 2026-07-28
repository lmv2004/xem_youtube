---
phase: 4
title: Review
status: completed
priority: P2
dependencies:
  - 3
---

# Phase 4: Review

## Overview
Rà soát code, UX, và bảo mật trước khi công bố.

## Requirements
- Functional: xác nhận acceptance criteria của plan.
- Non-functional: code đọc được, không có dead code, accessibility cơ bản.

## Architecture
Dùng checklist thủ công + `code-reviewer` subagent để review `app/`, `components/`, `lib/`, `app/api/`.

## Related Code Files
- Modify: bất kỳ file nào có phát hiện trong review.

## Implementation Steps
1. Chạy `/ck:code-review` trên diff đã sinh ra.
2. Kiểm tra: bảo mật (không lộ key, validate input), UX (tiếng Việt, responsive, focus-visible), hiệu năng (Next/Image hoặc `<img>` lazy, tránh re-render không cần).
3. Accessibility: alt trên thumbnail, label form, `aria-live` cho vùng trạng thái.
4. Cleanup console.log, dead code, type-only imports.

## Success Criteria
- [ ] Không còn cảnh báo nghiêm trọng.
- [ ] Acceptance criteria đạt.

## Risk Assessment
- Bỏ sót lỗ hổng caching: đảm bảo route không cache response có lỗi.
- Thay đổi nhỏ nhưng đứt contract: ghi lại breaking change.
