"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import type { Role } from "@/lib/types";
import { useI18n } from "@/i18n/client";

/** Защита кабинетов на клиенте. Реальная проверка прав выполняется на сервере API (роль в JWT + владение объектом). */
export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { L } = useI18n();
  const { user, ready } = useAuth();
  const pathname = usePathname();
  if (!ready)
    return (
      <div className="flex min-h-[70svh] items-center justify-center pt-[var(--header-h)]" role="status" aria-label={L("Загрузка")}>
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-forest/15 border-t-turquoise" />
      </div>
    );
  if (!user)
    return (
      <Gate title={L("Нужно войти")} text={L("Этот раздел доступен после входа в аккаунт.")}>
        <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn-primary">{L("Войти")}</Link>
        <Link href={`/register?next=${encodeURIComponent(pathname)}`} className="btn-outline">{L("Регистрация")}</Link>
      </Gate>
    );
  if (user.role !== role)
    return (
      <Gate
        title={L("Раздел недоступен")}
        text={role === "Tourist" ? L("Конструктор маршрутов и заявки доступны аккаунту туриста.") : role === "Operator" ? L("Кабинет доступен только туроператорам.") : L("Раздел доступен только администратору.")}
      >
        <Link href="/" className="btn-outline">{L("На главную")}</Link>
      </Gate>
    );
  return <>{children}</>;
}

function Gate({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="container-x flex min-h-[70svh] flex-col items-start justify-center pt-[var(--header-h)]">
      <h1 className="h-display text-[44px] text-forest">{title}</h1>
      <p className="mt-3 max-w-md text-stone">{text}</p>
      <div className="mt-8 flex gap-3">{children}</div>
    </section>
  );
}
