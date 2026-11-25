import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/AuthForms";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return { title: L("Вход"), robots: { index: false } };
}

export default async function LoginPage() {
  const { L } = await getI18n();
  return (
    <AuthLayout title={L("Вход")} text={L("Войдите, чтобы планировать маршруты и отправлять заявки.")}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
