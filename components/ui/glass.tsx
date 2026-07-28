import * as React from "react";
import { cn } from "@/lib/utils";

// Glass surface wrapper with three intensity levels.
type GlassProps = React.HTMLAttributes<HTMLDivElement> & {
  intensity?: "soft" | "default" | "strong";
  as?: React.ElementType;
};

export function Glass({
  className,
  intensity = "default",
  as: Tag = "div",
  ...props
}: GlassProps) {
  const intensityClass =
    intensity === "strong" ? "glass-strong" : intensity === "soft" ? "glass" : "glass";
  return <Tag className={cn("rounded-2xl", intensityClass, className)} {...props} />;
}
