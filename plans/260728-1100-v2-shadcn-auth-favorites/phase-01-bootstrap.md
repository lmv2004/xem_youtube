---
phase: 1
title: Bootstrap
status: completed
priority: P1
dependencies: []
---

# Phase 1: Bootstrap

## Overview
Thêm dependency cho shadcn, Prisma, Auth.js, dark mode, các thư viện hỗ trợ. Không thay đổi flow v1.

## Requirements
- Cài: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`, `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-avatar`, `@radix-ui/react-toast`, `@radix-ui/react-label`, `@radix-ui/react-separator`, `@radix-ui/react-tooltip`.
- Cài dev: `prisma`, `@prisma/client`, `tsx` (chạy seed).
- Cài: `next-auth@beta` (v5), `@auth/prisma-adapter`, `bcryptjs`, `zod`, `react-hook-form`, `@hookform/resolvers`.
- Cấu hình dark mode: `<html class="dark">` trong layout, `darkMode: ["class"]` trong tailwind.

## Related Code Files
Modify: `package.json`, `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`.
Create: `lib/utils.ts`, `components.json`.

## Implementation Steps
1. Cài dependencies.
2. Thêm `darkMode: ["class"]` + mapping CSS variables.
3. Viết `lib/utils.ts` (`cn = clsx + tailwind-merge`).
4. Viết `components.json` shadcn style.

## Success Criteria
- [ ] `npm run build` vẫn pass sau khi thêm deps.
- [ ] `class="dark"` được render trên `<html>`.

## Risk Assessment
- Phiên bản NextAuth v5 vẫn beta; khoá version cụ thể để tránh breaking.
- Tailwind v3 (hiện tại) tương thích với shadcn; KHÔNG nâng lên v4 trong phase này.
