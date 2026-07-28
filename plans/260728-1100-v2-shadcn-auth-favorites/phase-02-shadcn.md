---
phase: 2
title: Shadcn
status: completed
priority: P1
dependencies:
  - 1
---

# Phase 2: Shadcn

## Overview
Tạo các component shadcn cốt lõi theo phong cách copy-paste: button, card, input, label, tabs, dialog, sheet, skeleton, badge, avatar, dropdown-menu, separator, toast, form.

## Requirements
- Theo style shadcn mới: dùng `forwardRef`, `cva`, `cn`.
- Dark mode mặc định.

## Related Code Files
Create: `components/ui/button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `tabs.tsx`, `dialog.tsx`, `sheet.tsx`, `skeleton.tsx`, `badge.tsx`, `avatar.tsx`, `dropdown-menu.tsx`, `separator.tsx`, `toast.tsx`, `toaster.tsx`, `use-toast.ts`, `form.tsx`, `tooltip.tsx`.

## Implementation Steps
1. Định nghĩa CSS variables theme dark trong `globals.css` (--background, --foreground, --card, --primary, --muted, --border, --accent, --destructive...).
2. Tạo từng component theo mẫu shadcn (đã rút gọn để vừa MVP).
3. Export `toast` provider trong layout.

## Success Criteria
- [ ] `import { Button } from "@/components/ui/button"` dùng được ở mọi nơi.
- [ ] Dark mode tokens nhất quán (không dùng Tailwind colors mặc định).

## Risk Assessment
- Toast cần Client Provider; tránh double-mount trong dev bằng `useEffect`.
