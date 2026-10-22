import { getTranslator } from "@/lib/locale-server";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Đăng nhập") };
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <LoginForm
          googleEnabled={Boolean(
            process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
          )}
        />
      </Suspense>
    </AuthShell>
  );
}
