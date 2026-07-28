import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { VideoItem } from "@/lib/types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "collection";
}

export function videoItemToRecord(v: VideoItem) {
  return {
    videoId: v.id,
    title: v.title,
    channel: v.channel,
    thumbnail: v.thumbnail,
    duration: v.durationSeconds,
    viewCount: v.viewCount,
    embedUrl: v.embedUrl,
    watchUrl: v.watchUrl,
    publishedAt: v.publishedAt,
    description: v.description,
  };
}
