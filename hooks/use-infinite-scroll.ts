"use client";
import { useEffect, useRef } from "react";

type Options = {
  enabled?: boolean;
  rootMargin?: string;
};

/** Gọi onIntersect khi sentinel lọt vào viewport — dùng cho infinite scroll. */
export function useInfiniteScroll(
  onIntersect: () => void,
  { enabled = true, rootMargin = "600px" }: Options = {},
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onIntersect);
  callbackRef.current = onIntersect;

  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) callbackRef.current();
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}
