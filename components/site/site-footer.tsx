"use client";
import { useTranslations } from "@/components/locale-provider";
import Link from "next/link";

export function SiteFooter() {
  const t = useTranslations();
  return (
    <footer className="container mt-12 border-t border-border py-7 text-xs leading-6 text-muted-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>
          © {new Date().getFullYear()}{" "}
          {t("XemPhim · Khám phá và xem cùng nhau.")}{" "}
        </p>
        <div className="flex gap-5">
          <Link href="/watch" className="hover:text-foreground">
            {t("Xem bằng liên kết")}{" "}
          </Link>
          <Link href="/rooms" className="hover:text-foreground">
            {t("Phòng xem chung")}{" "}
          </Link>
        </div>
      </div>
      <p className="mt-2">
        {t(
          "Video được phát qua YouTube. Nội dung thuộc về các nhà sáng tạo tương ứng.",
        )}{" "}
      </p>
    </footer>
  );
}
