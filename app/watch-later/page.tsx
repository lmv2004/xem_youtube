import { getTranslator } from "@/lib/locale-server";
import { SiteShell } from "@/components/site/site-shell";
import { WatchLaterLibrary } from "@/components/watch-later-library";

export async function generateMetadata() {
  const t = await getTranslator();
  return {
    title: t("Xem sau"),
    description: t("Lưu và sắp xếp những video bạn muốn xem sau."),
  };
}

export default function WatchLaterPage() {
  return (
    <SiteShell>
      <WatchLaterLibrary />
    </SiteShell>
  );
}
