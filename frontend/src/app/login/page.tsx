import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Вход", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthLayout title="Вход" text="Войдите, чтобы планировать маршруты и отправлять заявки.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
