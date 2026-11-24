"use client";

import { CabinetShell } from "@/components/account/shared";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <CabinetShell
      title="Администрирование"
      subtitle="Управление пользователями, модерация и контент портала"
      tabs={[
        { href: "/admin", label: "Обзор" },
        { href: "/admin/users", label: "Пользователи" },
        { href: "/admin/operators", label: "Операторы" },
        { href: "/admin/tours", label: "Модерация туров" },
        { href: "/admin/reviews", label: "Отзывы" },
        { href: "/admin/content", label: "Контент" },
        { href: "/admin/dictionaries", label: "Справочники" },
        { href: "/admin/audit", label: "Журнал" },
      ]}
    >
      {children}
    </CabinetShell>
  );
}
