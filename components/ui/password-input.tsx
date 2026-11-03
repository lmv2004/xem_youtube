"use client";
import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
export const PasswordInput = forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<typeof Input>>(
  ({ className, disabled, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const t = useTranslations();
    return <div className="relative">
      <Input {...props} ref={ref} disabled={disabled} type={visible ? "text" : "password"} className={cn("pr-12", className)} />
      <button type="button" disabled={disabled} aria-label={t(visible ? "Ẩn mật khẩu" : "Hiện mật khẩu")} aria-pressed={visible} onClick={() => setVisible(value => !value)} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted-foreground hover:text-foreground disabled:opacity-50">
        {visible ? <EyeOff aria-hidden="true" className="h-4 w-4"/> : <Eye aria-hidden="true" className="h-4 w-4"/>}
      </button>
    </div>;
  }
);
PasswordInput.displayName = "PasswordInput";
