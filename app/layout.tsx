import { getTranslator } from "@/lib/locale-server";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit, Noto_Sans_Telugu } from "next/font/google";
import { LocaleProvider } from "@/components/locale-provider";
import { getLocale } from "@/lib/locale-server";
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
const telugu = Noto_Sans_Telugu({
  subsets: ["telugu", "latin"],
  variable: "--font-telugu",
  display: "swap",
});

// Runs before first paint so the stored theme is applied without a flash of
// the wrong colour scheme. Kept as a plain string (not imported from the
// client module) so this file stays a server component.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("xemphim:theme");var t=(s==="light"||s==="dark"||s==="system")?s:"dark";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;var e=document.documentElement;e.classList.toggle("dark",r==="dark");e.style.colorScheme=r;}catch(_){}})();`;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  return {
    title: {
      default: t("XemPhim - Nền tảng xem và khám phá video hiện đại"),
      template: "%s | XemPhim",
    },
    description: t(
      "Khám phá video YouTube xu hướng, xem chung realtime cùng bạn bè, tìm kiếm thông minh và quản lý thư viện video cá nhân hóa.",
    ),
    applicationName: "XemPhim",
    authors: [{ name: "XemPhim" }],
    openGraph: {
      title: t("XemPhim - Nền tảng xem và khám phá video hiện đại"),
      description: t(
        "Khám phá video YouTube xu hướng, xem chung realtime cùng bạn bè, tìm kiếm thông minh và quản lý thư viện video cá nhân hóa.",
      ),
      siteName: "XemPhim",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("XemPhim - Nền tảng xem và khám phá video hiện đại"),
      description: t(
        "Khám phá video YouTube xu hướng, xem chung realtime cùng bạn bè, tìm kiếm thông minh và quản lý thư viện video cá nhân hóa.",
      ),
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Warm up connections to the YouTube hosts we always hit so the
            first video page feels instant instead of paying DNS+TLS twice. */}
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://www.youtube-nocookie.com" />
      </head>
      <body
        className={`${sans.variable} ${display.variable} ${telugu.variable} min-h-screen bg-background font-sans antialiased text-foreground selection:bg-rose-500/30 selection:text-white`}
      >
        <LocaleProvider initialLocale={locale}>
          <ThemeProvider defaultTheme="dark">
            <AuthSessionProvider>
              <ClientLogInit />
              {children}
              <Toaster />
            </AuthSessionProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
