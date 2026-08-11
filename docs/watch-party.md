# Phòng xem chung & chat

Tính năng cho phép nhiều người xem cùng một video ở cùng một điểm thời gian và
 trò chuyện ngay bên cạnh trình phát.

## Luồng sử dụng

1. Người dùng đã đăng nhập bấm nút **Xem cùng** trên bất kỳ thẻ video nào.
2. Hệ thống tạo phòng, sinh mã 6 ký tự và chuyển chủ phòng tới `/rooms/<mã>`.
3. Chủ phòng chia sẻ link hoặc đọc mã cho bạn bè.
4. Người khác vào `/rooms` nhập mã, hoặc mở thẳng link.

## Mô hình đồng bộ

### Neo thời gian thay vì ghi liên tục

Database không lưu "giây hiện tại" theo từng nhịp. Phòng chỉ lưu một **mốc neo**:

- `positionSeconds` — vị trí tại thời điểm neo
- `lastSyncAt` — lúc đo vị trí đó
- `isPlaying`

Client tự suy ra vị trí hiện tại bằng `effectivePosition()` trong `lib/rooms.ts`.
Nhờ vậy chỉ ghi DB khi có thao tác thật (phát, tạm dừng, tua, đổi video), thay vì
ghi mỗi 2 giây.

### Polling 2 giây, một điểm cuối duy nhất

`GET /api/rooms/<mã>/sync` trả về **cả** trạng thái phát lẫn tin nhắn mới trong
cùng một phản hồi, nên mỗi nhịp 2 giây chỉ tốn đúng một vòng gọi mạng.

Tin nhắn lấy theo con trỏ `after` (mốc thời gian), nên mỗi lần chỉ tải phần mới
chứ không tải lại toàn bộ cuộc trò chuyện.

Hook `useRoomSync` tạm dừng polling khi tab bị ẩn và gọi lại ngay khi quay lại.

### Ngưỡng lệch

Người xem chỉ bị tua cưỡng bức khi lệch quá `DRIFT_TOLERANCE_SECONDS` (2.5 giây).
Lệch dưới ngưỡng thì để yên — tua liên tục vài phần giây khó chịu hơn nhiều so
 với việc chậm một nhịp.

`effectivePosition()` còn bù lệch đồng hồ giữa máy người dùng và máy chủ dựa trên
`serverTime`; thiếu bước này thì máy có đồng hồ sai sẽ bị tua vô tận.

## Phân quyền

| Hành động | Khách | Đã đăng nhập | Chủ phòng |
| --- | --- | --- | --- |
| Xem phòng | có | có | có |
| Đọc chat | có | có | có |
| Gửi chat | không | có | có |
| Điều khiển phát | không | không | có |

Chỉ chủ phòng ghi được trạng thái phát. Người xem tự bấm phát/tua thì sẽ bị kéo
về điểm chung ở nhịp đồng bộ kế tiếp.

## Vì sao dùng YouTube IFrame API

`components/featured-player.tsx` nhúng bằng thẻ `<iframe>` thường, không điều khiển
được phát/tạm dừng/tua từ script — không dùng lại cho phòng được.
`components/room/sync-player.tsx` nạp IFrame API chính thức của YouTube (script
`https://www.youtube.com/iframe_api`, **không thêm thư viện npm**) và tự khai báo
phần type tối thiểu để khỏi cần `@types/youtube`.

## Các tệp liên quan

| Tệp | Vai trò |
| --- | --- |
| `lib/rooms.ts` | Hằng số, kiểu dữ liệu, `effectivePosition()`, sinh mã phòng |
| `app/api/rooms/route.ts` | Tạo phòng, liệt kê phòng của chủ |
| `app/api/rooms/[code]/route.ts` | Chi tiết phòng, chủ phòng cập nhật trạng thái |
| `app/api/rooms/[code]/sync/route.ts` | Điểm cuối polling duy nhất |
| `app/api/rooms/[code]/messages/route.ts` | Gửi tin nhắn |
| `hooks/use-room-sync.ts` | Vòng polling 2 giây |
| `hooks/use-create-room.ts` | Tạo phòng từ một video |
| `components/room/sync-player.tsx` | Trình phát điều khiển được |
| `components/room/room-client.tsx` | Điều phối đồng bộ |
| `components/room/room-chat.tsx` | Khung chat |
| `components/room/rooms-index.tsx` | Danh sách phòng, vào bằng mã |

## Cần làm trước khi chạy

Schema có thêm hai bảng `Room` và `RoomMessage`, phải chạy migration:

```bash
npm run prisma:migrate   # hoặc npm run prisma:push khi chỉ thử nhanh
npm run typecheck
npm run lint
```

## Giới hạn hiện tại

- Polling 2 giây nên độ trễ cảm nhận được tối đa khoảng 2 giây. Đủ tốt để xem
  chung, muốn thời gian thực hơn thì cần WebSocket.
- Chưa có danh sách người đang trong phòng (cần cơ chế heartbeat).
- Chưa chuyển quyền chủ phòng khi chủ thoát.
- Chưa có hàng đợi phát chung trong phòng; đổi video là thao tác của chủ phòng.
