import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Регистрация", robots: { index: false } };

export default function RegisterPage() {
  return (
    <AuthLayout title="Регистрация" text="Аккаунт туриста или туроператора — бесплатно.">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}
