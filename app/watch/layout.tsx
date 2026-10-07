import { getTranslator } from "@/lib/locale-server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return {
    title: t("Xem nhanh"),
    description: t("Dán liên kết YouTube để xem ngay trên nền tảng XemPhim."),
  };
}

export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
