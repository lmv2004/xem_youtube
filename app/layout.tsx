import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { ClientLogInit } from "@/components/client-log-init";
import { ThemeProvider } from "@/components/theme/theme-provider";

// Runs before first paint so the stored theme is applied without a flash of
// the wrong colour scheme. Kept as a plain string (not imported from the
// client module) so this file stays a server component.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("xemphim:theme");var t=(s==="light"||s==="dark"||s==="system")?s:"dark";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var e=document.documentElement;e.classList.toggle("dark",r==="dark");e.style.colorScheme=r;}catch(_){}})();`;

export const metadata: Metadata = {
  title: "YoutubePremium",
  description:
    "Chọn sở thích, khám phá và lưu lại những video YouTube bạn yêu thích theo phong cách cá nhân.",
  applicationName: "YoutubePremium",
  authors: [{ name: "YoutubePremium" }],
  openGraph: {
    title: "YoutubePremium",
    description:
      "Chọn sở thích, khám phá và lưu lại những video YouTube bạn yêu thích theo phong cách cá nhân.",
  },
  twitter: {
    title: "YoutubePremium",
    description:
      "Chọn sở thích, khám phá và lưu lại những video YouTube bạn yêu thích theo phong cách cá nhân.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
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
