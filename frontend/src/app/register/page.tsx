import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/AuthForms";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return { title: L("Регистрация"), robots: { index: false } };
}

export default async function RegisterPage() {
  const { L } = await getI18n();
  return (
    <AuthLayout title={L("Регистрация")} text={L("Аккаунт туриста или туроператора — бесплатно.")}>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  );
}
