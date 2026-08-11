"use client";
import { Crown, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RoomMemberDto } from "@/lib/rooms";
import { cn } from "@/lib/utils";

const VISIBLE = 6;

function initialOf(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export function RoomMembers({
  members,
  myClientId,
}: {
  members: RoomMemberDto[];
  myClientId: string | null;
}) {
  const shown = members.slice(0, VISIBLE);
  const overflow = members.length - shown.length;

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        {members.length} đang xem
      </span>

      <TooltipProvider delayDuration={200}>
        <ul className="flex items-center">
          {shown.map((m) => (
            <li key={m.clientId} className="-ml-2 first:ml-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="relative inline-block">
                    <Avatar
                      className={cn(
                        "h-7 w-7 ring-2 ring-background",
                        m.clientId === myClientId && "ring-primary",
                      )}
                    >
                      <AvatarImage src={m.image ?? ""} alt="" />
                      <AvatarFallback className="text-[11px]">
                        {initialOf(m.name)}
                      </AvatarFallback>
                    </Avatar>
                    {m.isHost ? (
                      <Crown className="absolute -right-1 -top-1 h-3 w-3 text-amber-400" />
                    ) : null}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {m.name}
                  {m.clientId === myClientId ? " (bạn)" : ""}
                  {m.isHost ? " · chủ phòng" : m.isGuest ? " · khách" : ""}
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </TooltipProvider>

      {overflow > 0 ? (
        <span className="text-xs text-muted-foreground">+{overflow}</span>
      ) : null}
    </div>
  );
}
