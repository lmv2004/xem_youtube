"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookmarkPlus,
  FolderOpen,
  Heart,
  LayoutGrid,
  Library,
  List,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { VideoItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoGrid, type ViewMode } from "@/components/video-grid";
import { NewCollectionForm } from "@/components/new-collection-form";
import { cn } from "@/lib/utils";

type CollectionWithItems = {
  id: string;
  name: string;
  slug: string;
  itemCount: number;
  updatedAt: string;
  thumbnails: string[];
};

type Props = {
  collections: CollectionWithItems[];
  savedVideos: VideoItem[];
};

export function FavoritesLibrary({ collections, savedVideos }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "collections" ? "collections" : "favorites";

  const [activeTab, setActiveTab] = useState<"favorites" | "collections">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [view, setView] = useState<ViewMode>("grid");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);

  // Filter and sort saved videos
  const filteredVideos = useMemo(() => {
    let result = [...savedVideos];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) => v.title.toLowerCase().includes(q) || v.channel.toLowerCase().includes(q),
      );
    }

    if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "oldest") {
      result.reverse();
    }

    return result;
  }, [savedVideos, searchQuery, sortBy]);

  return (
    <div className="space-y-7 animate-in-up">
      {/* Top Header & Tabs Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Thư viện cá nhân
            </h1>
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-400">
              Bộ sưu tập
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Lưu trữ, phân loại theo danh sách chủ đề và thưởng thức video chất lượng cao mọi lúc.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-card/80 p-1.5 backdrop-blur-xl self-start sm:self-auto shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab("favorites")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
              activeTab === "favorites"
                ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_0_15px_rgba(255,42,84,0.4)]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
          >
            <Heart className={cn("h-3.5 w-3.5", activeTab === "favorites" && "fill-white")} />
            <span>Video yêu thích ({savedVideos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("collections")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
              activeTab === "collections"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
          >
            <Library className="h-3.5 w-3.5" />
            <span>Bộ sưu tập ({collections.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Video yêu thích */}
      {activeTab === "favorites" && (
        <div className="space-y-6">
          {/* Controls Bar: Search & Sort & View */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lọc video trong yêu thích..."
                className="h-10 rounded-xl border-white/10 bg-white/5 pl-9 text-xs sm:text-sm focus:border-rose-500/50"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "title")}
                className="h-10 rounded-xl border border-white/10 bg-card/80 px-3 text-xs font-semibold text-foreground backdrop-blur-md focus:outline-none focus:border-rose-500/50"
              >
                <option value="newest">Mới lưu nhất</option>
                <option value="oldest">Lưu cũ nhất</option>
                <option value="title">Tên video (A-Z)</option>
              </select>

              <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-card/80 p-0.5 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-lg transition",
                    view === "grid" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Chế độ lưới"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-lg transition",
                    view === "list" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  title="Chế độ danh sách"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Videos Grid */}
          {filteredVideos.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-white/10 bg-card/50 backdrop-blur-2xl space-y-4">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-500">
                <Heart className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-lg font-bold text-foreground">
                  {savedVideos.length === 0
                    ? "Chưa có video yêu thích nào"
                    : "Không tìm thấy video phù hợp"}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                  {savedVideos.length === 0
                    ? "Nhấn nút 'Thích' hoặc biểu tượng trái tim ở bất kỳ video nào để lưu vào thư viện xem lại sau."
                    : "Hãy thử đổi từ khóa tìm kiếm trong danh sách đã lưu của bạn."}
                </p>
              </div>
              {savedVideos.length === 0 && (
                <Button asChild size="sm" className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold shadow-[0_0_20px_rgba(255,42,84,0.4)]">
                  <Link href="/">Khám phá video ngay</Link>
                </Button>
              )}
            </div>
          ) : (
            <VideoGrid
              items={filteredVideos}
              view={view}
              onPlay={(item) => router.push(`/watch/${item.id}`)}
            />
          )}
        </div>
      )}

      {/* Tab 2: Danh sách bộ sưu tập */}
      {activeTab === "collections" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">Danh sách bộ sưu tập của bạn</h2>
            <Button
              size="sm"
              onClick={() => setNewCollectionOpen(!newCollectionOpen)}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo bộ sưu tập</span>
            </Button>
          </div>

          {/* New Collection Form Drawer */}
          {newCollectionOpen && (
            <div className="p-5 rounded-3xl border border-purple-500/30 bg-card/90 shadow-2xl backdrop-blur-2xl animate-in-up space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-foreground">Tạo bộ sưu tập mới</h3>
                <button
                  type="button"
                  onClick={() => setNewCollectionOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Đóng
                </button>
              </div>
              <NewCollectionForm />
            </div>
          )}

          {collections.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-white/10 bg-card/50 backdrop-blur-2xl space-y-4">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-purple-500/10 text-purple-400">
                <Library className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-lg font-bold text-foreground">Bạn chưa có bộ sưu tập nào</p>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                  Tạo các bộ sưu tập theo chủ đề (Học lập trình, Nhạc chill, Phim hay...) để sắp xếp video gọn gàng.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setNewCollectionOpen(true)}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold shadow-[0_0_20px_rgba(139,92,246,0.4)]"
              >
                Tạo bộ sưu tập đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((c) => (
                <Link
                  key={c.id}
                  href={`/favorites/${c.id}`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-card/65 transition-all duration-300 hover:border-purple-500/40 hover:bg-card/90 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
                >
                  {/* Collage Cover from first 4 thumbnails */}
                  <div className="relative aspect-video w-full bg-black/60 overflow-hidden">
                    {c.thumbnails.length >= 4 ? (
                      <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-0.5">
                        {c.thumbnails.slice(0, 4).map((thumb, idx) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={idx}
                            src={thumb}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ))}
                      </div>
                    ) : c.thumbnails.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.thumbnails[0]}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground">
                        <FolderOpen className="h-9 w-9 opacity-40 text-purple-400" />
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                    {/* Overlay badge with video count */}
                    <div className="absolute bottom-3 right-3 rounded-lg border border-white/20 bg-black/75 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-md">
                      {c.itemCount} video
                    </div>
                  </div>

                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-display font-bold text-base text-foreground group-hover:text-purple-400 transition-colors truncate">
                        {c.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cập nhật {new Date(c.updatedAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10 text-xs text-muted-foreground">
                      <span className="font-semibold text-purple-400 group-hover:underline">
                        Mở bộ sưu tập
                      </span>
                      <Play className="h-3.5 w-3.5 text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
