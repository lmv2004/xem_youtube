"use client";
import { LogIn, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Glass } from "@/components/ui/glass";
import { MAX_NAME_LENGTH, type RoomVideo } from "@/lib/rooms";

type Props = {
  code: string;
  title: string;
  video: RoomVideo;
  name: string;
  onNameChange: (value: string) => void;
  onJoin: () => void;
  joining: boolean;
};

/**
 * Shown before joining. Asking for a name up front means the member list and
 * playback attribution are meaningful from the very first action, instead of
 * a room full of anonymous entries.
 */
export function JoinGate({
  code,
  title,
  video,
  name,
  onNameChange,
  onJoin,
  joining,
}: Props) {
  return (
    <Glass intensity="strong" className="mx-auto max-w-xl overflow-hidden">
      {video.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={video.thumbnail} alt="" className="aspect-video w-full object-cover" />
      ) : null}

      <div className="space-y-4 p-5">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Phòng <span className="font-mono">{code}</span> · {title}
          </p>
          <h1 className="text-lg font-semibold leading-snug">{video.title}</h1>
          <p className="text-sm text-muted-foreground">{video.channel}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onJoin();
          }}
          className="space-y-2"
        >
          <label htmlFor="room-name" className="text-sm font-medium">
            Tên hiển thị trong phòng
          </label>
          <Input
            id="room-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Tên của bạn"
            className="h-11"
          />
          <Button type="submit" size="lg" className="w-full" disabled={joining}>
            <LogIn className="mr-1 h-4 w-4" />
            {joining ? "Đang vào..." : "Tham gia phòng"}
          </Button>
        </form>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Ai trong phòng cũng phát, tạm dừng, tua và đổi video được. Muốn chat thì cần
          đăng nhập.
        </p>
      </div>
    </Glass>
  );
}
