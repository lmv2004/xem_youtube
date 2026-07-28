# Triển khai nội bộ (LAN) cho đồng nghiệp

Cho phép máy cùng subnet công ty truy cập bằng `http://<IP-máy-bạn>:3000`.

## 1. Chuẩn bị trên máy bạn

- Tìm IP LAN của máy:

  ```bash
  # Windows
  ipconfig
  # macOS / Linux
  ip addr
  ```

  Trên Windows thường là `192.168.x.y` hoặc `172.26.x.y`. Trong ví dụ này là `192.168.1.191`.

## 2. Cấu hình môi trường

Sửa `.env.local` cho khớp IP LAN (vì cookie Auth.js cần `AUTH_URL` đúng host):

```dotenv
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="<secret-32-byte>"
AUTH_URL="http://192.168.1.191:3000"     # <-- IP LAN của bạn
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
YOUTUBE_API_KEY=AIza...
```

Sau khi sửa, **khởi động lại** server.

## 3. Chạy server bind 0.0.0.0

```bash
npm run dev:lan     # dev
# hoặc
npm run build && npm run start:lan
```

Server sẽ in:

```
- Local:    http://localhost:3000
- Network:  http://192.168.1.191:3000
```

## 4. Firewall

Nếu đồng nghiệp không vào được, mở port 3000 trong Windows Firewall:

**Cách nhanh (PowerShell admin)**:

```powershell
New-NetFirewallRule -DisplayName "Next.js dev 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

**Hoặc dùng GUI**: Control Panel → Windows Defender Firewall → Advanced Settings → Inbound Rules → New Rule → Port → TCP 3000 → Allow.

## 5. Đồng nghiệp truy cập

Gửi URL cho đồng nghiệp:

```
http://192.168.1.191:3000
```

Họ đăng nhập bằng tài khoản demo (đã seed sẵn):

- Email: `demo@xemphim.local`
- Mật khẩu: `Demo1234!`

> Mọi người dùng chung 1 account `demo` và 1 collection `Yêu thích`. Đồng nghiệp cần collection riêng → vào `/register` để tạo.

## 6. Hạn chế

- Mọi collection/lịch sử thuộc về SQLite trên máy bạn. Khi tắt máy → mất dữ liệu (kể cả của đồng nghiệp).
- HTTPS không có → cookie Auth.js chỉ an toàn qua mạng LAN tin cậy. Cần HTTPS hay đăng nhập bằng Google OAuth thì chuyển sang deploy có domain (Vercel/Cloudflare) hoặc reverse proxy Cloudflare Tunnel.
- Tường lửa công ty có thể chặn traffic khác subnet — nhờ IT mở port 3000 nếu cần.
