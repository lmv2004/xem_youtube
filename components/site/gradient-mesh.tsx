"use client";

/**
 * Ultra-Modern Cinematic Ambient Aurora Mesh:
 * Combines high-resolution cyber grid, soft luminous neon orbs
 * (Crimson Ruby, Neon Violet, Cyber Cyan, Golden Amber),
 * and subtle vignettes to create a depth-rich movie theater atmosphere.
 */
export function GradientMesh() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* Subtle cyber background grid */}
      <div className="absolute inset-0 bg-grid mask-fade-b opacity-30" />
      <div className="absolute inset-0 bg-dots mask-fade-radial opacity-20" />

      {/* Primary Rose / Crimson Aurora Orb */}
      <div className="absolute -top-48 left-1/2 h-[750px] w-[750px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,42,84,0.18)_0%,rgba(255,42,84,0.05)_45%,transparent_70%)] blur-[90px] animate-mesh-pan" />

      {/* Cyber Violet Orb on Top-Right */}
      <div className="absolute top-[10%] -right-48 h-[650px] w-[650px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.16)_0%,rgba(139,92,246,0.04)_50%,transparent_70%)] blur-[100px] animate-mesh-pan [animation-delay:-7s]" />

      {/* Cyber Cyan Orb on Center-Left */}
      <div className="absolute top-[45%] -left-48 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.14)_0%,rgba(6,182,212,0.03)_50%,transparent_70%)] blur-[95px] animate-mesh-pan [animation-delay:-14s]" />

      {/* Golden Amber flare bottom right */}
      <div className="absolute -bottom-48 right-[15%] h-[550px] w-[550px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.1)_0%,transparent_70%)] blur-[110px] animate-mesh-pan [animation-delay:-21s]" />

      {/* Cinematic vignette & dark fades */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_40%,rgba(5,7,12,0.85)_100%)]" />
    </div>
  );
}
