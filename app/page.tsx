import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { GradientMesh } from "@/components/site/gradient-mesh";
import { HeroExplorer } from "@/components/hero-explorer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <GradientMesh />
      <SiteHeader />
      <main className="container flex-1 space-y-10 py-8">
        <HeroExplorer />
      </main>
      <SiteFooter />
    </div>
  );
}
