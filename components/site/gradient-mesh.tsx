/** A restrained, static background that works in both themes. */
export function GradientMesh() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.045),transparent_55%)]"
    />
  );
}
