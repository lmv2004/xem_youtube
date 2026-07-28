import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { ClientLogInit } from "@/components/client-log-init";

export const metadata: Metadata = {
  title: "XemPhimYouTube",
  description:
    "Chọn sở thích, khám phá và lưu lại những video YouTube bạn yêu thích theo phong cách cá nhân.",
  applicationName: "XemPhimYouTube",
  authors: [{ name: "XemPhimYouTube" }],
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthSessionProvider>
          <ClientLogInit />
          {children}
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
