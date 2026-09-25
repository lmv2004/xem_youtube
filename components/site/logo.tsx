"use client";

import { clsx } from "clsx";

type Props = {
  className?: string;
  size?: number;
};

/**
 * Ultra-modern Cinematic Mark for XemPhim:
 * A 3D-angled crystal prism play glyph enclosed in an obsidian squircle
 * with a multi-stop neon iridescent border and glowing celestial lens flare.
 */
export function Logo({ className, size = 32 }: Props) {
  return (
    <div
      className={clsx(
        "group/logo relative inline-flex shrink-0 items-center justify-center transition-transform duration-300 hover:scale-105",
        className,
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label="XemPhim Logo"
    >
      {/* Outer ambient glow */}
      <div
        className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-rose-600/40 via-violet-600/30 to-cyan-500/40 opacity-50 blur-md transition-opacity duration-300 group-hover/logo:opacity-90"
        aria-hidden
      />

      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        fill="none"
        className="relative drop-shadow-[0_4px_12px_rgba(255,42,84,0.35)]"
      >
        <defs>
          <linearGradient id="xp-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF3366" />
            <stop offset="45%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>

          <linearGradient id="xp-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#141724" />
            <stop offset="100%" stopColor="#080911" />
          </linearGradient>

          {/* Prism facets */}
          <linearGradient id="xp-f1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF2A54" />
            <stop offset="100%" stopColor="#FF6B4A" />
          </linearGradient>

          <linearGradient id="xp-f2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>

          <linearGradient id="xp-f3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          <filter id="xp-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Squircle base */}
        <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#xp-bg)" />
        <rect
          x="2.5"
          y="2.5"
          width="43"
          height="43"
          rx="13.5"
          stroke="url(#xp-border)"
          strokeWidth="1.6"
          strokeOpacity="0.85"
        />

        {/* Ambient colored light core */}
        <circle
          cx="24"
          cy="24"
          r="10"
          fill="#FF2A54"
          opacity="0.35"
          filter="url(#xp-glow-filter)"
        />

        {/* 3D Prism Play Glyph */}
        {/* Top facet */}
        <path
          d="M18.5 14.5 L33.5 24 L24 24 Z"
          fill="url(#xp-f1)"
          className="transition-all duration-300 group-hover/logo:brightness-110"
        />
        {/* Bottom facet */}
        <path
          d="M18.5 14.5 L24 24 L18.5 33.5 Z"
          fill="url(#xp-f2)"
          className="transition-all duration-300 group-hover/logo:brightness-110"
        />
        {/* Center-right facet */}
        <path
          d="M18.5 33.5 L24 24 L33.5 24 Z"
          fill="url(#xp-f3)"
          className="transition-all duration-300 group-hover/logo:brightness-110"
        />

        {/* Gloss edge highlight */}
        <path
          d="M18.5 14.5 L33.5 24"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />

        {/* Celestial Star Flare */}
        <path
          d="M34 10 C34 11.8 35.8 13.5 37.5 13.5 C35.8 13.5 34 15.2 34 17 C34 15.2 32.2 13.5 30.5 13.5 C32.2 13.5 34 11.8 34 10 Z"
          fill="#FFFFFF"
          className="animate-pulse transition-transform duration-300 group-hover/logo:scale-125"
          style={{ transformOrigin: "34px 13.5px" }}
        />
      </svg>
    </div>
  );
}

/** Logo + wordmark lockup used in header, footer, and branding moments. */
export function Wordmark({
  className,
  size = 30,
  hideTextOnMobile = false,
}: Props & { hideTextOnMobile?: boolean }) {
  return (
    <span className={clsx("group inline-flex items-center gap-3 select-none", className)}>
      <Logo size={size} />
      <span
        className={clsx(
          "flex items-center gap-1.5 font-display tracking-tight leading-none",
          hideTextOnMobile && "hidden sm:inline-flex",
        )}
      >
        <span className="text-[19px] font-extrabold text-foreground tracking-tight">
          Xem<span className="bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(244,63,94,0.3)]">Phim</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-rose-400 uppercase shadow-[0_0_10px_rgba(244,63,94,0.2)]">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
          PRO
        </span>
      </span>
    </span>
  );
}
