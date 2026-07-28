"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") ?? "/";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setError(data.message ?? "Đăng ký thất bại.");
      setPending(false);
      return;
    }
    const login = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (!login || login.error) {
      setError("Đăng ký thành công nhưng đăng nhập tự động thất bại. Hãy thử lại.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function onGoogle() {
    setPending(true);
    setError(null);
    // signIn with redirect=true so the browser navigates to /api/auth/signin/google
    await signIn("google", { callbackUrl });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Tạo tài khoản</CardTitle>
        <CardDescription>Miễn phí, không cần thẻ tín dụng.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên hiển thị</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
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
            <Label htmlFor="password">Mật khẩu (tối thiểu 6 ký tự)</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Đang tạo tài khoản..." : "Đăng ký"}
          </Button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <Separator className="flex-1" />
          <span>hoặc</span>
          <Separator className="flex-1" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void onGoogle()}
          disabled={pending}
        >
          Đăng ký với Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link href="/login" className="ml-1 text-primary hover:underline">
          Đăng nhập
        </Link>
      </CardFooter>
    </Card>
  );
}
