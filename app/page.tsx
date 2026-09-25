import { Suspense } from "react";
import { SiteShell } from "@/components/site/site-shell";
import { HeroExplorer } from "@/components/hero-explorer";
import { VideoGridSkeleton } from "@/components/video-grid";

export default function HomePage() {
  return (
    <SiteShell>
      <Suspense fallback={<VideoGridSkeleton count={8} />}>
        <HeroExplorer />
      </Suspense>
    </SiteShell>
  );
}
