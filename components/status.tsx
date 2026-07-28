"use client";

import type { SearchStatus } from "@/lib/types";

type Props = {
  status: SearchStatus;
  onRetry: () => void;
};

function SkeletonGrid() {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="overflow-hidden rounded-xl border border-ink/10 bg-white/60"
        >
          <div className="aspect-video w-full animate-pulse bg-ink/10" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-ink/10" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-ink/10" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function StatusPanel({ status, onRetry }: Props) {
  if (status.kind === "idle") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-ink/10 bg-panel/60 px-4 py-3 text-sm text-muted"
      >
        Nhập hoặc chọn một chủ đề để bắt đầu.
      </div>
    );
  }
  if (status.kind === "loading") {
    return (
      <div className="space-y-3" aria-live="polite">
        <p className="text-sm text-muted">
          Đang tìm video cho chủ đề <span className="font-medium text-ink">{status.topic}</span>...
        </p>
        <SkeletonGrid />
      </div>
    );
  }
  if (status.kind === "empty") {
    return (
      <div
        role="status"
        className="rounded-lg border border-ink/10 bg-panel/60 px-4 py-3 text-sm"
      >
        Không tìm thấy video nào cho chủ đề{" "}
        <span className="font-medium">{status.topic}</span>. Thử chủ đề khác nhé.
      </div>
    );
  }
  if (status.kind === "missing-key") {
    return (
      <div
        role="alert"
        className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm"
      >
        Máy chủ chưa được cấu hình <code className="font-mono">YOUTUBE_API_KEY</code>. Tạo
        file <code className="font-mono">.env.local</code> với khoá YouTube Data API v3 rồi
        khởi động lại <code className="font-mono">npm run dev</code>. Xem hướng dẫn trong
        README.
      </div>
    );
  }
  if (status.kind === "error") {
    return (
      <div role="alert" className="rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
        <p className="font-medium text-accent">Không thể tải video.</p>
        <p className="mt-1 text-muted">{status.message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex rounded-md border border-accent px-3 py-1 text-xs font-semibold text-accent transition hover:bg-accent hover:text-paper"
        >
          Thử lại
        </button>
      </div>
    );
  }
  return null;
}
