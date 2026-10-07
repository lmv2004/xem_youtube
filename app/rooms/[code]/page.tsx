import { getTranslator } from "@/lib/locale-server";
import { SiteShell } from "@/components/site/site-shell";
import { RoomClient } from "@/components/room/room-client";
import { normalizeRoomCode } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const t = await getTranslator();
  const { code } = await params;
  return {
    title: t("Phòng {p0}", { p0: code.toUpperCase() }),
    description: t(
      "Xem video YouTube cùng bạn bè trong phòng xem chung XemPhim.",
    ),
  };
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <SiteShell>
      <RoomClient key={code} code={normalizeRoomCode(code)} />
    </SiteShell>
  );
}
