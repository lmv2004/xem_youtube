import { SiteShell } from "@/components/site/site-shell";
import { PageSkeleton } from "@/components/page-skeleton";
export default function Loading() { return <SiteShell><PageSkeleton kind="grid" /></SiteShell>; }
