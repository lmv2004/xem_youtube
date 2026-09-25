import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xem nhanh | XemPhim",
  description: "Dán liên kết YouTube để xem ngay trên nền tảng XemPhim.",
};

export default function WatchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
