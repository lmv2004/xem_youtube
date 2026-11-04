"use client";
import * as React from "react";
import { toast as sonnerToast } from "sonner";

type ToastInput = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: "default" | "destructive";
  action?: React.ReactNode;
};

export function toast({ title, description, variant }: ToastInput) {
  const content = title ?? "";
  const options = {
    description,
  };

  if (variant === "destructive") {
    return sonnerToast.error(content, options);
  }
  return sonnerToast.success(content, options);
}

export function useToast() {
  return {
    toast,
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
    toasts: [],
  };
}

export { sonnerToast };
