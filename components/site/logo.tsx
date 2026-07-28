import { clsx } from "clsx";

type Props = {
  className?: string;
  size?: number;
};

export function Logo({ className, size = 28 }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={clsx("text-primary", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(0 90% 65%)" />
          <stop offset="50%" stopColor="hsl(330 85% 65%)" />
          <stop offset="100%" stopColor="hsl(220 85% 65%)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#logo-gradient)" />
      <path
        d="M13 10.5 22 16l-9 5.5v-11z"
        fill="white"
        fillOpacity="0.95"
      />
    </svg>
  );
}
