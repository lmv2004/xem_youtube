import { getTranslator } from "@/lib/locale-server";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Đăng ký") };
}

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
