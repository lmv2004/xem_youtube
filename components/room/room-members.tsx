"use client";
import { useId, useRef, useState } from "react";
import { useTranslations } from "@/components/locale-provider";
import { ChevronDown, Crown, Pencil, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_NAME_LENGTH, sanitizeDisplayName, type RoomMemberDto } from "@/lib/rooms";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function initialOf(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

export function RoomMembers({
  members,
  myClientId,
  myName,
  onRename,
}: {
  members: RoomMemberDto[];
  myClientId: string | null;
  myName: string;
  onRename: (name: string) => void;
}) {
  const t = useTranslations();
  const [draft, setDraft] = useState<string | null>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const inputId = useId();
  const cleanName = sanitizeDisplayName(draft ?? "");
  const containsAt = draft?.includes("@");
  const confirmedName = members.find((member) => member.clientId === myClientId)?.name;
  const finishEditing = () => {
    setDraft(null);
    editButtonRef.current?.focus();
  };

  return (
    <Popover onOpenChange={(open) => { if (!open) setDraft(null); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex min-h-10 max-w-full cursor-pointer items-center gap-2 rounded-lg px-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {members.length} {t("đang xem")}
          </span>
          <span className="flex -space-x-2" aria-hidden="true">
            {members.slice(0, 4).map((member) => (
              <Avatar
                key={member.clientId}
                className="h-6 w-6 ring-2 ring-card"
              >
                <AvatarImage src={member.image ?? ""} alt="" />
                <AvatarFallback className="text-[10px]">
                  {initialOf(member.clientId === myClientId ? myName : member.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </span>
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={12}
        aria-label={t("Thành viên trong phòng")}
        className="z-[70] max-h-[min(18rem,var(--radix-popover-content-available-height))] w-64 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain p-2"
      >
        <div className="mb-1 border-b border-border px-2 pb-2">
          <Button
            ref={editButtonRef}
            type="button"
            variant="ghost"
            className="min-h-10 w-full justify-start gap-2 px-1"
            aria-expanded={draft !== null}
            onClick={() => draft === null ? setDraft(myName) : finishEditing()}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            {t("Đổi tên hiển thị")}
          </Button>
          {draft !== null && (
            <form
              className="space-y-2 pt-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!cleanName || cleanName === myName) return;
                onRename(cleanName);
                finishEditing();
              }}
            >
              <label htmlFor={inputId} className="text-sm font-medium">
                {t("Tên hiển thị trong phòng")}
              </label>
              <Input
                id={inputId}
                value={draft}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) => setDraft(event.target.value)}
                autoComplete="off"
                autoFocus
                required
                aria-invalid={containsAt}
                aria-describedby={containsAt ? `${inputId}-error` : undefined}
              />
              {containsAt && (
                <p id={`${inputId}-error`} role="alert" className="text-xs text-destructive">
                  {t("Tên hiển thị không được chứa ký tự @.")}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={finishEditing}>
                  {t("Hủy")}
                </Button>
                <Button type="submit" size="sm" disabled={!cleanName || cleanName === myName}>
                  {t("Lưu")}
                </Button>
              </div>
            </form>
          )}
          {confirmedName && confirmedName !== myName && (
            <p role="status" className="px-1 text-xs text-muted-foreground">
              {t("Đang đồng bộ tên hiển thị…")}
            </p>
          )}
        </div>
        <ul className="space-y-1" aria-label={t("Thành viên trong phòng")}>
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
                  {initialOf(member.clientId === myClientId ? myName : member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm",
                    member.clientId === myClientId && "font-semibold",
                  )}
                >
                  {member.clientId === myClientId ? myName : member.name}
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
      </PopoverContent>
    </Popover>
  );
}
