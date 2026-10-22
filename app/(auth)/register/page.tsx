import { getTranslator } from "@/lib/locale-server";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthShell } from "@/components/auth/auth-shell";

export async function generateMetadata() {
  const t = await getTranslator();
  return { title: t("Đăng ký") };
}

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <RegisterForm
          googleEnabled={Boolean(
            process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
          )}
        />
      </Suspense>
    </AuthShell>
  );
}
