import { SiteShell } from "@/components/site/site-shell";
import { RoomClient } from "@/components/room/room-client";
import { normalizeRoomCode } from "@/lib/rooms";

export const dynamic = "force-dynamic";

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
