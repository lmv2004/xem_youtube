"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bookmark,
  FolderOpen,
  Heart,
  LayoutGrid,
  Library,
  List,
  Plus,
  Search,
} from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { useTranslations } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoGrid, type ViewMode } from "@/components/video-grid";
import { NewCollectionForm } from "@/components/new-collection-form";
import { useWatchLater } from "@/hooks/use-watch-later";
import { cn } from "@/lib/utils";

type CollectionWithItems = {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
  updatedAt: string;
  thumbnails: string[];
};
type Props = { collections: CollectionWithItems[]; savedVideos: VideoItem[] };

export function FavoritesLibrary({ collections, savedVideos }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "collections" ? "collections" : "favorites";
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [view, setView] = useState<ViewMode>("grid");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const watchLater = useWatchLater();
  const query = searchQuery.trim().toLocaleLowerCase();

  const filteredVideos = useMemo(() => {
    const result = savedVideos.filter(
      (item) =>
        !query ||
        `${item.title} ${item.channel}`.toLocaleLowerCase().includes(query),
    );
    if (sortBy === "title")
      result.sort((a, b) => a.title.localeCompare(b.title, t.locale));
    if (sortBy === "oldest") result.reverse();
    return result;
  }, [savedVideos, query, sortBy, t.locale]);

  const filteredCollections = useMemo(() => {
    const result = collections.filter(
      (collection) =>
        !query || collection.name.toLocaleLowerCase().includes(query),
    );
    if (sortBy === "title")
      result.sort((a, b) => a.name.localeCompare(b.name, t.locale));
    if (sortBy === "oldest") result.reverse();
    return result;
  }, [collections, query, sortBy, t.locale]);

  function tabUrl(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    return `/favorites?${params}`;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-start">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Library className="h-4 w-4" />
            {t("Thư viện của bạn")}
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t("Thư viện cá nhân")}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t("Tất cả video đã lưu và bộ sưu tập, gọn trong một nơi.")}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/watch-later">
            <Bookmark className="mr-2 h-4 w-4" />
            {t("Xem sau")}
          </Link>
        </Button>
      </header>

      <nav aria-label={t("Thư viện cá nhân")} className="flex flex-wrap gap-2">
        {[
          {
            value: "favorites",
            icon: Heart,
            label: t("Yêu thích"),
            count: savedVideos.length,
          },
          {
            value: "collections",
            icon: FolderOpen,
            label: t("Bộ sưu tập"),
            count: collections.length,
          },
        ].map(({ value, icon: Icon, label, count }) => (
          <Link
            key={value}
            href={tabUrl(value)}
            prefetch={false}
            scroll={false}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              )
                return;
              event.preventDefault();
              // Native history updates useSearchParams without another database render.
              window.history.pushState(null, "", tabUrl(value));
            }}
            aria-current={activeTab === value ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors",
              activeTab === value
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            <span
              className={cn(
                "rounded-full px-2 text-xs",
                activeTab === value ? "bg-primary-foreground/15" : "bg-muted",
              )}
            >
              {count}
            </span>
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label={
              activeTab === "favorites"
                ? t("Lọc video trong yêu thích...")
                : t("Tìm bộ sưu tập")
            }
            placeholder={
              activeTab === "favorites"
                ? t("Lọc video trong yêu thích...")
                : t("Tìm bộ sưu tập")
            }
            className="h-11 bg-card pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            aria-label={t("Sắp xếp thư viện")}
            className="h-11 flex-1 rounded-xl border bg-card px-3 text-sm sm:flex-none"
          >
            <option value="newest">{t("Mới lưu nhất")}</option>
            <option value="oldest">{t("Lưu cũ nhất")}</option>
            <option value="title">{t("Tên (A–Z)")}</option>
          </select>
          {activeTab === "favorites" && (
            <div className="flex rounded-xl border bg-card p-0.5">
              {[
                {
                  value: "grid" as const,
                  icon: LayoutGrid,
                  label: t("Chế độ lưới"),
                },
                {
                  value: "list" as const,
                  icon: List,
                  label: t("Chế độ danh sách"),
                },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setView(value)}
                  aria-label={label}
                  aria-pressed={view === value}
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-lg",
                    view === value
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
          {activeTab === "collections" && (
            <Button
              onClick={() => setNewCollectionOpen(!newCollectionOpen)}
              aria-expanded={newCollectionOpen}
              aria-controls="new-collection"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("Tạo bộ sưu tập")}
            </Button>
          )}
        </div>
      </div>

      {activeTab === "collections" && newCollectionOpen && (
        <section
          id="new-collection"
          className="space-y-4 rounded-2xl border bg-card p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{t("Tạo bộ sưu tập mới")}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewCollectionOpen(false)}
            >
              {t("Đóng")}
            </Button>
          </div>
          <NewCollectionForm />
        </section>
      )}

      <p role="status" className="text-sm text-muted-foreground">
        {activeTab === "favorites"
          ? t("{count} video đã lưu", { count: filteredVideos.length })
          : t("{count} bộ sưu tập", { count: filteredCollections.length })}
      </p>

      {activeTab === "favorites" ? (
        filteredVideos.length > 0 ? (
          <VideoGrid
            items={filteredVideos}
            view={view}
            onPlay={(item) => router.push(`/watch/${item.id}`)}
            onToggleWatchLater={watchLater.toggle}
            isInWatchLater={watchLater.has}
          />
        ) : (
          <div className="space-y-4 rounded-2xl border border-dashed bg-card px-5 py-14 text-center">
            <Heart className="mx-auto h-8 w-8 text-primary" />
            <h2 className="text-xl font-semibold">
              {savedVideos.length === 0
                ? t("Chưa có video yêu thích nào")
                : t("Không tìm thấy video phù hợp")}
            </h2>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
              {savedVideos.length === 0
                ? t(
                    "Nhấn nút 'Thích' hoặc biểu tượng trái tim ở bất kỳ video nào để lưu vào thư viện xem lại sau.",
                  )
                : t(
                    "Hãy thử đổi từ khóa tìm kiếm trong danh sách đã lưu của bạn.",
                  )}
            </p>
            {savedVideos.length === 0 ? (
              <Button asChild>
                <Link href="/">{t("Khám phá video ngay")}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                {t("Xóa bộ lọc")}
              </Button>
            )}
          </div>
        )
      ) : filteredCollections.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed bg-card px-5 py-14 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-primary" />
          <h2 className="text-xl font-semibold">
            {collections.length === 0
              ? t("Bạn chưa có bộ sưu tập nào")
              : t("Không tìm thấy bộ sưu tập")}
          </h2>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            {t(
              "Tạo các bộ sưu tập theo chủ đề (Học lập trình, Nhạc chill, Phim hay...) để sắp xếp video gọn gàng.",
            )}
          </p>
          <Button
            variant={collections.length === 0 ? "default" : "outline"}
            onClick={() =>
              collections.length === 0
                ? setNewCollectionOpen(true)
                : setSearchQuery("")
            }
          >
            {collections.length === 0
              ? t("Tạo bộ sưu tập đầu tiên")
              : t("Xóa bộ lọc")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCollections.map((collection) => (
            <Link
              key={collection.id}
              href={`/favorites/${collection.id}`}
              className="group overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary/50"
            >
              <div className="relative aspect-video overflow-hidden bg-muted">
                {collection.thumbnails.length ? (
                  <Image
                    unoptimized
                    width={640}
                    height={360}
                    src={collection.thumbnails[0]}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105 motion-reduce:transform-none"
                  />
                ) : (
                  <div className="grid h-full place-items-center">
                    <FolderOpen className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <span className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2 py-1 text-xs font-medium text-white">
                  {t("{count} video", { count: collection.itemCount })}
                </span>
              </div>
              <div className="space-y-2 p-4">
                <h2 className="truncate font-semibold group-hover:text-primary">
                  {collection.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t("Cập nhật")}{" "}
                  {new Date(collection.updatedAt).toLocaleDateString(t.locale)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
