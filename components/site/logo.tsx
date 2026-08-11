import { clsx } from "clsx";

type Props = {
  className?: string;
  size?: number;
};

/**
 * App mark: a rounded "screen" with a play glyph and two signal arcs,
 * suggesting streaming + discovery. The gradient is defined once and reused;
 * duplicate ids across instances resolve to the same definition.
 */
export function Logo({ className, size = 28 }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={clsx("shrink-0", className)}
      role="img"
      aria-label="XemPhimYouTube"
    >
      <defs>
        <linearGradient id="xp-logo-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(350 90% 60%)" />
          <stop offset="55%" stopColor="hsl(325 85% 58%)" />
          <stop offset="100%" stopColor="hsl(265 85% 62%)" />
        </linearGradient>
        <linearGradient id="xp-logo-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.28" />
          <stop offset="60%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Screen */}
      <rect x="1.5" y="4" width="29" height="24" rx="7.5" fill="url(#xp-logo-fill)" />
      <rect x="1.5" y="4" width="29" height="24" rx="7.5" fill="url(#xp-logo-sheen)" />

      {/* Play glyph */}
      <path d="M13.4 11.3 20.6 16l-7.2 4.7v-9.4z" fill="white" />

      {/* Signal arcs */}
      <path
        d="M24.4 12.6a5.2 5.2 0 0 1 0 6.8"
        stroke="white"
        strokeOpacity="0.75"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M7.6 12.6a5.2 5.2 0 0 0 0 6.8"
        stroke="white"
        strokeOpacity="0.75"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Logo + wordmark lockup used in the header and footer. */
export function Wordmark({
  className,
  size = 26,
  hideTextOnMobile = false,
}: Props & { hideTextOnMobile?: boolean }) {
  return (
    <span className={clsx("flex items-center gap-2.5", className)}>
      <Logo size={size} />
      <span
        className={clsx(
          "font-display text-[15px] font-semibold tracking-tight",
          hideTextOnMobile && "hidden sm:inline",
        )}
      >
        Xem<span className="text-gradient">Phim</span>
      </span>
    </span>
  );
}
