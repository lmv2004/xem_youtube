"use client";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="system"
      closeButton
      richColors
      expand={false}
      toastOptions={{
        classNames: {
          toast:
            "rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl text-foreground font-sans",
          description: "text-muted-foreground text-xs leading-relaxed",
          actionButton: "rounded-xl bg-primary text-primary-foreground font-medium",
          cancelButton: "rounded-xl bg-muted text-muted-foreground",
          closeButton: "border-border bg-card hover:bg-muted text-foreground",
        },
      }}
    />
  );
}
