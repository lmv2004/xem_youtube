import { SiteShell } from "@/components/site/site-shell";
import { RoomsIndex } from "@/components/room/rooms-index";

export const metadata = {
  title: "Phòng xem chung | XemPhim",
  description: "Tạo phòng và xem video YouTube trực tiếp cùng bạn bè với đồng bộ realtime.",
};

export default function RoomsPage() {
  return (
    <SiteShell>
      <RoomsIndex />
    </SiteShell>
  );
}
