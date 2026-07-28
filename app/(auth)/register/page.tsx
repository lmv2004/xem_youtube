import { RegisterForm } from "@/components/auth/register-form";

export const metadata = { title: "Đăng ký - XemPhimYouTube" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <RegisterForm />
    </main>
  );
}
