import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { AppSidebar } from "@/components/site/app-sidebar";

/**
 * Shared page frame: background mesh + header + navigation rail + footer.
 * Extracted from app/page.tsx so other routes can adopt the same layout.
 */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <GradientMesh />
      <SiteHeader />
      <div className="container flex flex-1 items-start gap-6 py-8">
        <AppSidebar />
        <main className="min-w-0 flex-1 space-y-10">{children}</main>
      </div>
      <SiteFooter />
    </div>
  );
}
