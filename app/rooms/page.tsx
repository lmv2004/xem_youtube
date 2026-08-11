import { SiteShell } from "@/components/site/site-shell";
import { RoomsIndex } from "@/components/room/rooms-index";

export const metadata = {
  title: "Phòng xem chung",
};

export default function RoomsPage() {
  return (
    <SiteShell>
      <RoomsIndex />
    </SiteShell>
  );
}
