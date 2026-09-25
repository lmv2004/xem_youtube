import { Suspense } from "react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { AppSidebar } from "@/components/site/app-sidebar";
import { MobileNav } from "@/components/site/mobile-nav";
import { BackToTop } from "@/components/back-to-top";
import { CommandPalette } from "@/components/command-palette";

/**
 * Shared page frame.
 *
 * Layout per breakpoint:
 * - mobile: full-width content, bottom tab bar (extra bottom padding so the
 *   footer is never hidden behind it)
 * - lg+: sidebar rail beside the content, no bottom bar
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
      <GradientMesh />
      <SiteHeader />

      <div className="container flex flex-1 items-start gap-6 py-5 sm:py-8">
        <Suspense fallback={<aside className="hidden w-56 shrink-0 lg:block" />}>
          <AppSidebar />
        </Suspense>
        <main className="min-w-0 flex-1 space-y-7 sm:space-y-10">{children}</main>
      </div>

      <SiteFooter />
      <MobileNav />
      <BackToTop />
      <CommandPalette />
    </div>
  );
}
