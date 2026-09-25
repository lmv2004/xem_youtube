import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { ClientLogInit } from "@/components/client-log-init";
import { ThemeProvider } from "@/components/theme/theme-provider";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

const display = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

// Runs before first paint so the stored theme is applied without a flash of
// the wrong colour scheme. Kept as a plain string (not imported from the
// client module) so this file stays a server component.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("xemphim:theme");var t=(s==="light"||s==="dark"||s==="system")?s:"dark";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var e=document.documentElement;e.classList.toggle("dark",r==="dark");e.style.colorScheme=r;}catch(_){}})();`;

export const metadata: Metadata = {
  title: {
    default: "XemPhim - Nền tảng xem và khám phá video hiện đại",
    template: "%s | XemPhim",
  },
  description:
    "Khám phá video YouTube xu hướng, xem chung realtime cùng bạn bè, tìm kiếm thông minh và quản lý thư viện video cá nhân hóa.",
  applicationName: "XemPhim",
  authors: [{ name: "XemPhim" }],
  openGraph: {
    title: "XemPhim - Nền tảng xem và khám phá video hiện đại",
    description:
      "Khám phá video YouTube xu hướng, xem chung realtime cùng bạn bè, tìm kiếm thông minh và quản lý thư viện video cá nhân hóa.",
    siteName: "XemPhim",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XemPhim - Nền tảng xem và khám phá video hiện đại",
    description:
      "Khám phá video YouTube xu hướng, xem chung realtime cùng bạn bè, tìm kiếm thông minh và quản lý thư viện video cá nhân hóa.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${sans.variable} ${display.variable} min-h-screen bg-background font-sans antialiased text-foreground selection:bg-rose-500/30 selection:text-white`}>
        <ThemeProvider defaultTheme="dark">
          <AuthSessionProvider>
            <ClientLogInit />
            {children}
            <Toaster />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
