import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site/site-header";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata = { title: "Tài khoản - XemPhimYouTube" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container max-w-2xl py-10">
        <Card>
          <CardHeader>
            <CardTitle>Tài khoản của bạn</CardTitle>
            <CardDescription>Thông tin cơ bản dùng trong XemPhimYouTube.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Tên: </span>
              <span className="font-medium">{session.user.name ?? "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              <span className="font-medium">{session.user.email}</span>
            </p>
            <SignOutButton />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
