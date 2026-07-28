# Cấu hình Google OAuth cho NextAuth.js

Hướng dẫn tạo Google OAuth client và kết nối với XemPhimYouTube.

## 1. Tạo Google OAuth Client

1. Vào https://console.cloud.google.com/ → chọn project (hoặc tạo mới).
2. **APIs & Services** → **Library** → tìm **Google+ API** hoặc **People API** → Enable.
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
4. **Application type**: **Web application**.
5. **Name**: `XemPhimYouTube` (tuỳ ý).
6. **Authorized JavaScript origins** — danh sách domain gọi Google:

   ```
   http://localhost:3000
   https://<your-project>.vercel.app
   ```

   (Mỗi domain bạn cần.)

7. **Authorized redirect URIs** — danh sách URL Google sẽ redirect về sau khi login:

   ```
   http://localhost:3000/api/auth/callback/google
   https://<your-project>.vercel.app/api/auth/callback/google
   ```

   ⚠️ **Quan trọng**: phải khớp CHÍNH XÁC scheme + host + path. Bỏ dấu `/` cuối cùng.

8. Bấm **Create** → copy **Client ID** và **Client Secret**.

## 2. Cấu hình biến môi trường

### Local (`C:/Users/vuonglm/workspace/XemPhimYoutube/.env.local`)

```dotenv
AUTH_GOOGLE_ID="123456789-abc...xyz.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-abc...xyz"
AUTH_URL="http://localhost:3000"
```

### Vercel (Production)

1. Vercel Dashboard → Project → **Settings** → **Environment Variables**.
2. Thêm:
   - `AUTH_GOOGLE_ID` = Client ID
   - `AUTH_GOOGLE_SECRET` = Client Secret
3. Set cho cả **Production** và **Preview**.
4. **Redeploy** để env vars có hiệu lực.

## 3. Production authorized callbacks

Khi deploy production URL khác với preview, mỗi URL cần có redirect URI riêng:

```
https://main-<hash>.vercel.app/api/auth/callback/google
https://<branch>-<hash>.vercel.app/api/auth/callback/google
```

**Cách dễ nhất**: thêm **wildcard** prefix `https://*.vercel.app/api/auth/callback/google` vào Authorized redirect URIs.

⚠️ Google không chính thức hỗ trợ wildcard cho OAuth. Phải thêm từng URL hoặc dùng custom domain.

**Khuyến nghị**: dùng **custom domain** (vd `xemphim.yourdomain.com`) → chỉ cần 1 redirect URI.

## 4. Kiểm tra

1. Mở trang đăng nhập trên Vercel.
2. Bấm **"Tiếp tục với Google"**.
3. Bảng Google account hiện ra → chọn account.
4. Redirect về app → đăng nhập thành công.
5. App tạo user trong Postgres (qua `PrismaAdapter`).

## 5. Lỗi thường gặp

### `redirect_uri_mismatch`

Authorized redirect URI trên Google Cloud **KHÔNG khớp** URL được gửi. Kiểm tra:
- Scheme: `https://` (production) hoặc `http://` (localhost)
- Host: `your-project.vercel.app` (case-insensitive)
- Path: `/api/auth/callback/google` (chính xác, có dấu `/` đầu)
- Không có trailing slash

### `invalid_client` (401)

`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` sai hoặc đã thu hồi. Tạo lại credentials mới.

### `Access blocked: This app's request is invalid`

OAuth consent screen chưa config. Vào **OAuth consent screen**:
- User type: **External** (cho mọi user Google)
- Test users: thêm email test của bạn (nếu app ở trạng thái "Testing")
- Scopes: `openid`, `email`, `profile`

### Trên production không hoạt động nhưng localhost OK

- `AUTH_URL` env chưa set đúng. Phải là `https://<project>.vercel.app` (no trailing slash).
- Sau khi sửa env → **Redeploy** (Vercel không auto-pickup env thay đổi).

### `Email already exists` sau khi Google OAuth

Tài khoản Google của bạn dùng email đã đăng ký bằng email/password trước đó. Auth.js v5 với `allowDangerousEmailAccountLinking: true` sẽ tự động liên kết.

## 6. Bảo mật

- **Không** commit `AUTH_GOOGLE_SECRET` lên git.
- `.env.local` đã được `.gitignore` loại trừ.
- Vercel env vars chỉ hiển thị với project owner.
- Có thể **giới hạn** OAuth client cho specific domain trong Google Cloud Console.
