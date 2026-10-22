"use client";
import { useTranslations } from "@/components/locale-provider";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authReturnPath } from "@/lib/auth-navigation";

export function LoginForm({
  googleEnabled = false,
}: {
  googleEnabled?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = authReturnPath(search.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      setPending(false);
      if (!res || res.error) {
        setError(t("Email hoặc mật khẩu không đúng."));
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError(t("Không thể kết nối. Vui lòng thử lại."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("Đăng nhập")}</CardTitle>
        <CardDescription>
          {t("Đăng nhập để lưu video yêu thích và xem lịch sử.")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("Mật khẩu")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {t(error ?? "")}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("Đang đăng nhập...") : t("Đăng nhập")}
          </Button>
        </form>
        {googleEnabled && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" />
              <span>{t("hoặc")}</span>
              <Separator className="flex-1" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                setError(null);
                try {
                  await signIn("google", { callbackUrl });
                } catch {
                  setError(t("Không thể kết nối. Vui lòng thử lại."));
                } finally {
                  setPending(false);
                }
              }}
            >
              {t("Tiếp tục với Google")}{" "}
            </Button>
          </>
        )}
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t("Chưa có tài khoản?")}{" "}
        <Link
          href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="ml-1 text-primary hover:underline"
        >
          {t("Đăng ký")}{" "}
        </Link>
      </CardFooter>
    </Card>
  );
}
