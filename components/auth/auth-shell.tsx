import Link from "next/link";
import { getTranslator } from "@/lib/locale-server";
import { Wordmark } from "@/components/site/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LanguageSelector } from "@/components/site/language-selector";

export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslator();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-8">
        <Link href="/" aria-label={t("Về trang chủ XemPhim")}>
          <Wordmark hideTextOnMobile />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSelector />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-10">
        {children}
        <Link
          href="/"
          className="rounded-lg px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          {t("Tiếp tục khám phá không cần tài khoản")}
        </Link>
      </main>
    </div>
  );
}
