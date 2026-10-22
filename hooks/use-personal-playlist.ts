"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  adjacentPlaylistVideo,
  canAccessPersonalPlaylist,
  createPlaylistAdvanceGuard,
  personalPlaylistHref,
  togglePlaylistShuffle,
  type PersonalPlaylist,
} from "@/lib/personal-playlist";
import {
  hasUnpersistedPlaylist,
  readPersonalPlaylist,
  savePersonalPlaylist,
} from "@/lib/personal-playlist-storage";

export function usePersonalPlaylist(
  videoId: string,
  restart: () => void,
  viewerId?: string,
  sessionLoading = false,
) {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("playlist");
  const [playlist, setPlaylist] = useState<PersonalPlaylist | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [navigationFailed, setNavigationFailed] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [finished, setFinished] = useState(false);
  const guard = useRef(createPlaylistAdvanceGuard());
  const pendingTarget = useRef<string | null>(null);

  useEffect(() => {
    const value = id ? readPersonalPlaylist(id) : null;
    if (value?.ownerId && sessionLoading) {
      setLoaded(false);
      return;
    }
    setPlaylist(
      value?.order.includes(videoId) && canAccessPersonalPlaylist(value, viewerId)
        ? value
        : null,
    );
    setStorageUnavailable(hasUnpersistedPlaylist());
    setLoaded(true);
    setPending(false);
    setNavigationFailed(false);
    setFinished(false);
    guard.current.reset();
  }, [id, videoId, viewerId, sessionLoading]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => {
      guard.current.reset();
      setPending(false);
      setNavigationFailed(true);
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  useEffect(() => {
    if (!playlist || document.visibilityState !== "visible") return;
    const next = adjacentPlaylistVideo(playlist, videoId, 1);
    // Warm only the next route, never an entire private collection.
    if (
      next &&
      next !== videoId &&
      canAccessPersonalPlaylist(playlist, viewerId) &&
      (!playlist.ownerId || !sessionLoading)
    ) router.prefetch(personalPlaylistHref(playlist, next));
  }, [playlist, videoId, viewerId, sessionLoading, router]);

  function select(target: string, automatic = false) {
    if (
      !playlist ||
      !canAccessPersonalPlaylist(playlist, viewerId) ||
      (playlist.ownerId && sessionLoading) ||
      !playlist.order.includes(target) ||
      !guard.current.claim()
    ) return;
    setFinished(false);
    setNavigationFailed(false);
    if (target === videoId) {
      restart();
      // Restarting this same iframe does not navigate or unmount this hook.
      guard.current.reset();
      return;
    }
    setPending(true);
    pendingTarget.current = target;
    router[automatic ? "replace" : "push"](personalPlaylistHref(playlist, target), { scroll: false });
  }

  function move(direction: -1 | 1, automatic = false) {
    if (
      !playlist ||
      !canAccessPersonalPlaylist(playlist, viewerId) ||
      (playlist.ownerId && sessionLoading)
    ) return;
    const target = adjacentPlaylistVideo(playlist, videoId, direction);
    if (target) select(target, automatic);
    else if (automatic) setFinished(true);
  }

  function update(next: PersonalPlaylist) {
    if (!canAccessPersonalPlaylist(next, viewerId) || (next.ownerId && sessionLoading)) return;
    setStorageUnavailable(!savePersonalPlaylist(next));
    setPlaylist(next);
  }

  return {
    playlist: playlist && canAccessPersonalPlaylist(playlist, viewerId) ? playlist : null,
    missing: loaded && Boolean(id) && !playlist,
    pending,
    navigationFailed,
    finished,
    storageUnavailable,
    select: (target: string) => select(target),
    previous: () => move(-1),
    next: () => move(1),
    ended: () => move(1, true),
    retry: () => {
      guard.current.reset();
      if (pendingTarget.current) select(pendingTarget.current);
    },
    shuffle: () => {
      if (playlist) update(togglePlaylistShuffle(playlist, videoId));
    },
    repeat: () => {
      if (playlist) update({ ...playlist, repeat: !playlist.repeat });
    },
    exit: () => router.replace(`/watch/${videoId}`, { scroll: false }),
  };
}
