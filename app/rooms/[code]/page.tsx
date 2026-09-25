import { SiteShell } from "@/components/site/site-shell";
import { RoomClient } from "@/components/room/room-client";
import { normalizeRoomCode } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return {
    title: `Phòng ${code.toUpperCase()} | XemPhim`,
    description: "Xem video YouTube cùng bạn bè trong phòng xem chung XemPhim.",
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
      <RoomClient code={normalizeRoomCode(code)} />
    </SiteShell>
  );
}
