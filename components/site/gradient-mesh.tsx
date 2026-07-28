// Animated gradient mesh background. Pure CSS + 3 conic blobs.
export function GradientMesh() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid mask-fade-b opacity-40" />
      <div className="absolute -top-40 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,hsl(0_80%_60%/.4),transparent_60%)] blur-3xl animate-mesh-pan" />
      <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,hsl(280_80%_60%/.35),transparent_60%)] blur-3xl animate-mesh-pan [animation-delay:-6s]" />
      <div className="absolute bottom-0 -left-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,hsl(190_80%_50%/.3),transparent_60%)] blur-3xl animate-mesh-pan [animation-delay:-12s]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
    </div>
  );
}
