"use client";

import { CabinetShell } from "@/components/account/shared";
import { useI18n } from "@/i18n/client";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { L } = useI18n();
  return (
    <CabinetShell
      title={L("Администрирование")}
      subtitle={L("Управление пользователями, модерация и контент портала")}
      tabs={[
        { href: "/admin", label: L("Обзор") },
        { href: "/admin/users", label: L("Пользователи") },
        { href: "/admin/operators", label: L("Операторы") },
        { href: "/admin/tours", label: L("Модерация туров") },
        { href: "/admin/reviews", label: L("Отзывы") },
        { href: "/admin/content", label: L("Контент") },
        { href: "/admin/dictionaries", label: L("Справочники") },
        { href: "/admin/audit", label: L("Журнал") },
      ]}
    >
      {children}
    </CabinetShell>
  );
}
