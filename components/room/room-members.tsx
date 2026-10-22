"use client";
import { useTranslations } from "@/components/locale-provider";
import { ChevronDown, Crown, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { RoomMemberDto } from "@/lib/rooms";
import { cn } from "@/lib/utils";

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
  const t = useTranslations();
  return (
    <details className="group relative w-fit max-w-full">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {members.length} {t("đang xem")}
        </span>
        <span className="flex -space-x-2" aria-hidden="true">
          {members.slice(0, 4).map((member) => (
            <Avatar key={member.clientId} className="h-6 w-6 ring-2 ring-card">
              <AvatarImage src={member.image ?? ""} alt="" />
              <AvatarFallback className="text-[10px]">
                {initialOf(member.name)}
              </AvatarFallback>
            </Avatar>
          ))}
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ul
        className="absolute left-0 top-full z-20 mt-1 max-h-72 w-64 max-w-[calc(100vw-3rem)] space-y-1 overflow-y-auto rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg"
        aria-label={t("Thành viên trong phòng")}
      >
        {members.length === 0 && (
          <li className="p-2 text-xs text-muted-foreground">
            {t("Đang tải danh sách thành viên…")}
          </li>
        )}
        {members.map((member) => (
          <li
            key={member.clientId}
            className="flex items-center gap-2 rounded-lg px-2 py-2"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={member.image ?? ""} alt="" />
              <AvatarFallback className="text-xs">
                {initialOf(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm",
                  member.clientId === myClientId && "font-semibold",
                )}
              >
                {member.name}
                {member.clientId === myClientId ? t(" (bạn)") : ""}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {member.isHost ? (
                  <>
                    <Crown className="h-3 w-3 text-primary" />
                    {t("Chủ phòng")}
                  </>
                ) : member.isGuest ? (
                  t("Khách")
                ) : (
                  t("Thành viên")
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
