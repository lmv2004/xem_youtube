# Phòng xem chung & chat

Tính năng cho phép nhiều người xem cùng một video ở cùng một điểm thời gian, thấy
ai đang xem, trò chuyện và đổi video ngay trong phòng.

## Luồng sử dụng

1. Người dùng đã đăng nhập bấm **Xem cùng nhau** trên trình phát chính hoặc
   **Xem cùng** trên thẻ video.
2. Hệ thống tạo phòng, sinh mã 6 ký tự và chuyển chủ phòng tới `/rooms/<mã>`.
3. Người khác mở link hoặc nhập mã ở `/rooms`, nhập tên rồi bấm **Tham gia phòng**.
4. Mặc định ai trong phòng cũng phát, tạm dừng, tua và đổi video được.
5. Chủ phòng có thể bật **Chỉ chủ phòng** để giữ quyền điều khiển khi cần.
6. **Rời phòng** gỡ tên khỏi danh sách ngay lập tức.

## Mô hình đồng bộ

### Neo thời gian thay vì ghi liên tục

Database không lưu "giây hiện tại" theo từng nhịp. Phòng chỉ lưu một **mốc neo**:

- `positionSeconds` — vị trí tại thời điểm neo
- `lastSyncAt` — lúc đo vị trí đó
- `isPlaying`

Client tự suy ra vị trí hiện tại bằng `effectivePosition()`. Nhờ vậy chỉ ghi DB khi
có thao tác thật, thay vì ghi mỗi 2 giây.

Hệ quả cần nhớ: **chỉ thao tác phát thực sự mới được phép chạm vào `lastSyncAt`**.
Bật/tắt công tắc khoá không ghi lại mốc neo — nếu ghi, mọi người sẽ bị tua lùi đúng
bằng khoảng thời gian phòng đã phát.

### Một điểm cuối cho mọi thứ

`POST /api/rooms/<mã>/sync` trả về trạng thái phát, tin nhắn mới, danh sách người
đang xem **và** trạng thái khoá trong cùng một phản hồi — mỗi nhịp 2 giây chỉ tốn
đúng một vòng gọi mạng dù hiển thị bốn loại dữ liệu.

Đây là POST chứ không phải GET vì mỗi lần gọi đồng thời là một nhịp heartbeat:
nó làm tươi `lastSeenAt` của người gọi và dọn những ai đã ngừng gọi.

## Ai đang xem

Bảng `RoomPresence` giữ mỗi tab một dòng. Khách (chưa đăng nhập) cũng xem được nên
định danh **không** dựa vào `userId` mà dựa vào `clientId` sinh từ trình duyệt và
lưu trong `localStorage`.

- Quá `PRESENCE_TIMEOUT_MS` (12 giây) không heartbeat thì bị gỡ khỏi danh sách.
- Đóng tab: `pagehide` gửi `navigator.sendBeacon` tới `/leave` để gỡ ngay, không phải
  chờ hết thời gian chờ.

## Ai được điều khiển

| Hành động | Khách | Đã đăng nhập | Chủ phòng |
| --- | --- | --- | --- |
| Xem phòng, đọc chat | có | có | có |
| Phát / tạm dừng / tua / đổi video | khi không khoá | khi không khoá | luôn |
| Bật/tắt công tắc khoá | không | không | có |
| Gửi chat | không | có | có |
| Tạo phòng | không | có | — |

Điều kiện nền cho mọi thao tác điều khiển là **đã tham gia phòng**: phải có dòng
presence thì `PATCH` mới được chấp nhận. Nhờ vậy luôn có tên để quy trách nhiệm,
và người lạ không thể điều khiển phòng họ chưa từng mở.

### Công tắc "chỉ chủ phòng điều khiển"

Cờ `Room.hostOnlyControl`, mặc định **tắt** — phòng cộng tác trừ khi chủ phòng chủ
động khoá. Chủ phòng bật/tắt bằng nút trên header phòng.

Chủ phòng được xác định theo **tài khoản** (`presence.userId === room.hostId`), không
theo `clientId`, nên họ vẫn là chủ phòng khi đổi máy hoặc mở tab khác.

Quyết định "được điều khiển hay không" nằm ở một hàm duy nhất dùng chung cho cả
server và client (`canControlPlayback` trong `lib/rooms.ts`), để nút bị vô hiệu trên
giao diện và request bị từ chối ở API không bao giờ lệch nhau.

Khi đang khoá, người không phải chủ phòng:

- Thấy nhãn "Chủ phòng đang khoá" và ghi chú dưới trình phát.
- Client **không gửi** thao tác lên server (khỏi tạo ra 403 vô nghĩa).
- Vẫn xem được tab đề xuất, nhưng nút "Phát cho cả phòng" bị vô hiệu.
- Nếu họ tự bấm phát trên khung YouTube, nhịp đồng bộ kế tiếp sẽ kéo họ về đúng
  trạng thái phòng trong khoảng 2 giây. Đây là cơ chế tự sửa, không phải chặn cứng.

### Chống vòng lặp echo

Đây là phần dễ hỏng nhất khi cho tất cả cùng điều khiển. Khi client tự gọi
`play()` / `seekTo()` để đuổi kịp phòng, trình phát phát ra đúng loại sự kiện như
khi người dùng bấm tay. Nếu phát lại sự kiện đó lên server thì cả phòng sẽ đẩy
qua đẩy lại vô tận. Hai lớp chặn:

1. **Cửa sổ im lặng** — sau mỗi lần tự điều khiển, bỏ qua sự kiện của trình phát
   trong ~1.2 giây (2.5 giây khi đổi video).
2. **Nhận diện chính mình** — phòng lưu `lastActionById`. Khi nhịp đồng bộ trả về
một thay đổi do chính mình gây ra, client bỏ qua thay vì tự tua lại.

`lastActionBy` (tên) được dùng cho dòng trạng thái kiểu "Minh đã tạm dừng".

### Ngưỡng lệch

Chỉ tua cưỡng bức khi lệch quá `DRIFT_TOLERANCE_SECONDS` (2.5 giây). Lệch dưới
ngưỡng thì để yên — tua liên tục vài phần giây khó chịu hơn nhiều so với việc
chậm một nhịp.

## Đổi video trong phòng

Tab **Đổi video** dùng lại endpoint `/api/videos` có sẵn:

- Không nhập gì → `?mode=trending`, dùng luôn làm danh sách đề xuất.
- Có từ khoá → `?topic=...`.

Chọn một video sẽ `PATCH` kèm `video`, server reset `positionSeconds` về 0, và mọi
client nạp video mới ở nhịp đồng bộ kế tiếp.

## Vì sao dùng YouTube IFrame API

`components/featured-player.tsx` nhúng bằng thẻ `<iframe>` thường, không điều khiển
được phát/tạm dừng/tua từ script. `components/room/sync-player.tsx` nạp IFrame API
chính thức của YouTube (**không thêm thư viện npm**) và tự khai báo phần type tối
thiểu để khỏi cần `@types/youtube`.

## Các tệp liên quan

| Tệp | Vai trò |
| --- | --- |
| `lib/rooms.ts` | Hằng số, kiểu dữ liệu, `effectivePosition()`, `canControlPlayback()`, `describeAction()` |
| `app/api/rooms/route.ts` | Tạo phòng, liệt kê phòng của chủ |
| `app/api/rooms/[code]/route.ts` | Chi tiết phòng, điều khiển phát, công tắc khoá |
| `app/api/rooms/[code]/sync/route.ts` | Polling + heartbeat + thành viên + trạng thái khoá |
| `app/api/rooms/[code]/leave/route.ts` | Rời phòng (hỗ trợ sendBeacon) |
| `app/api/rooms/[code]/messages/route.ts` | Gửi tin nhắn |
| `hooks/use-room-identity.ts` | clientId + tên hiển thị |
| `hooks/use-room-sync.ts` | Vòng polling 2 giây, rời phòng |
| `hooks/use-create-room.ts` | Tạo phòng từ một video |
| `components/room/sync-player.tsx` | Trình phát điều khiển được |
| `components/room/room-client.tsx` | Điều phối đồng bộ, công tắc khoá |
| `components/room/join-gate.tsx` | Màn hình nhập tên trước khi vào |
| `components/room/room-members.tsx` | Danh sách người đang xem |
| `components/room/room-search.tsx` | Tìm / đề xuất video trong phòng |
| `components/room/room-chat.tsx` | Khung chat |
| `components/room/rooms-index.tsx` | Danh sách phòng, vào bằng mã |

## Cần làm trước khi chạy

Schema thêm bảng `RoomPresence` và các cột `lastActionBy` / `lastActionById` /
`lastActionKind` / `hostOnlyControl` trên `Room`, phải chạy migration:

```bash
npm run prisma:migrate   # hoặc npm run prisma:push khi chỉ thử nhanh
npm run typecheck
npm run lint
```

## Giới hạn hiện tại

- Polling 2 giây nên độ trễ cảm nhận được tối đa khoảng 2 giây.
- YouTube không phát sự kiện "seek" riêng. Tua khi đang phát thì vẫn đồng bộ được
  (vì sau đó có sự kiện PLAYING), nhưng tua khi đang tạm dừng thì chỉ lan ra phòng
  khi phát lại.
- Khoá điều khiển là toàn phần: chưa có mức "cho phép một vài người được điều
  khiển" hay xin quyền tạm thời.
- Chưa chuyển quyền chủ phòng khi chủ thoát: nếu chủ phòng rời đi trong lúc đang
  khoá thì phòng sẽ kẹt ở trạng thái khoá cho đến khi họ quay lại.
- Chưa có hàng đợi phát chung trong phòng.
