import { getTranslator } from "@/lib/locale-server";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Đăng nhập") };
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
