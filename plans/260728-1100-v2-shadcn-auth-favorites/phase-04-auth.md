---
phase: 4
title: Auth
status: completed
priority: P1
dependencies:
  - 3
---

# Phase 4: Auth

## Overview
Cấu hình Auth.js v5 với Prisma adapter, Credentials provider (email + password) và Google provider.

## Requirements
- Session strategy: JWT.
- Middleware bảo vệ `/favorites`, `/history`, `/account`.
- Trang `/login`, `/register`, `/account` (cập nhật profile).

## Related Code Files
Create: `auth.ts`, `auth.config.ts`, `middleware.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/account/page.tsx`, `lib/actions/auth.ts`.
Modify: `app/layout.tsx` (SessionProvider).

## Implementation Steps
1. `auth.ts` export `auth`, `handlers`, `signIn`, `signOut`.
2. Credentials: gọi `prisma.user.findUnique` + `bcrypt.compare`.
3. Google: cấu hình qua env.
4. Middleware: `auth` callback check token.
5. UI form đăng ký/đăng nhập bằng shadcn Form + react-hook-form.

## Success Criteria
- [ ] Đăng ký user mới lưu DB với hash.
- [ ] Đăng nhập trả session JWT.
- [ ] `/favorites` redirect về `/login` khi chưa auth.

## Risk Assessment
- Edge runtime không chạy bcrypt → dùng Node runtime cho auth API.
- Google OAuth: docs yêu cầu callback URL đúng.
