"use client";
import { useTranslations } from "@/components/locale-provider";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const t = useTranslations();
  return (
    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
      {t("Đăng xuất")}{" "}
    </Button>
  );
}
