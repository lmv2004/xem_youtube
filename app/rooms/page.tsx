import { getTranslator } from "@/lib/locale-server";
import { SiteShell } from "@/components/site/site-shell";
import { RoomsIndex } from "@/components/room/rooms-index";

export async function generateMetadata() {
  const t = await getTranslator();
  return {
    title: t("Phòng xem chung"),
    description: t(
      "Tạo phòng và xem video YouTube trực tiếp cùng bạn bè với đồng bộ realtime.",
    ),
  };
}

export default function RoomsPage() {
  return (
    <SiteShell>
      <RoomsIndex />
    </SiteShell>
  );
}
