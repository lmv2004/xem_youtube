"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Glass } from "@/components/ui/glass";
import { normalizeRoomCode, ROOM_CODE_LENGTH } from "@/lib/rooms";

type RoomListItem = {
  code: string;
  title: string;
  videoTitle: string;
  thumbnail: string;
  messageCount: number;
  updatedAt: string;
};

export function RoomsIndex() {
  const router = useRouter();
  const { status } = useSession();
  const [code, setCode] = useState("");
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/rooms", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { items?: RoomListItem[] };
        if (!cancelled) setRooms(json.items ?? []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeRoomCode(code);
    if (normalized.length < 4) return;
    router.push("/rooms/" + normalized);
  };

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Phòng xem chung
        </h1>
        <p className="text-sm text-muted-foreground">
          Xem cùng lúc với bạn bè và trò chuyện ngay bên cạnh video.
        </p>
      </div>

      <Glass intensity="strong" className="space-y-3 p-5">
        <h2 className="text-sm font-semibold">Vào phòng bằng mã</h2>
        <form onSubmit={join} className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={"Ví dụ: " + "A".repeat(ROOM_CODE_LENGTH)}
            maxLength={ROOM_CODE_LENGTH}
            className="h-11 font-mono uppercase tracking-[0.3em]"
          />
          <Button type="submit" size="lg" disabled={code.trim().length < 4}>
            Vào phòng <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Ai có mã cũng xem được. Muốn chat thì cần đăng nhập.
        </p>
      </Glass>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Phòng bạn đã tạo</h2>

        {status !== "authenticated" ? (
          <Glass intensity="soft" className="p-5 text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Đăng nhập
            </Link>{" "}
            để tạo phòng riêng. Bấm nút{" "}
            <Users className="inline h-3.5 w-3.5" /> trên bất kỳ thẻ video nào ở trang Khám
            phá để mở phòng cho video đó.
          </Glass>
        ) : !loaded ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : rooms.length === 0 ? (
          <Glass intensity="soft" className="p-5 text-sm text-muted-foreground">
            Bạn chưa tạo phòng nào. Vào trang Khám phá, bấm nút{" "}
            <Users className="inline h-3.5 w-3.5" /> trên thẻ video để mở phòng.
          </Glass>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rooms.map((r) => (
              <li key={r.code}>
                <Link
                  href={"/rooms/" + r.code}
                  className="flex gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40"
                >
                  {r.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.thumbnail}
                      alt=""
                      className="aspect-video w-28 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Radio className="h-3 w-3 text-primary" />
                      <span className="font-mono">{r.code}</span>
                    </p>
                    <p className="line-clamp-2 text-sm font-medium">{r.videoTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.messageCount} tin nhắn
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
