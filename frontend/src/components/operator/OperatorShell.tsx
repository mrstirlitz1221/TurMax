"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { CabinetShell } from "@/components/account/shared";
import { VERIFICATION } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export function OperatorShell({ children }: { children: React.ReactNode }) {
  const { L } = useI18n();
  const { user } = useAuth();
  return (
    <CabinetShell
      title={user?.operatorName ?? L("Кабинет оператора")}
      subtitle={user?.operatorStatus ? L("Статус проверки: {status}", { status: L(VERIFICATION[user.operatorStatus]) }) : undefined}
      tabs={[
        { href: "/operator", label: L("Обзор") },
        { href: "/operator/bookings", label: L("Заявки") },
        { href: "/operator/tours", label: L("Туры") },
        { href: "/operator/services", label: L("Тарифы") },
        { href: "/operator/reviews", label: L("Отзывы") },
        { href: "/operator/notifications", label: L("Уведомления") },
        { href: "/operator/profile", label: L("Профиль") },
      ]}
    >
      {user?.operatorStatus === "Pending" && (
        <p className="mb-8 rounded-sm bg-[#fbf1dc] p-4 text-[14px] text-[#6e4a0e]">
          {L("Профиль на проверке у администратора. Вы можете готовить туры и тарифы — в каталоге они появятся после проверки и модерации.")}
        </p>
      )}
      {user?.operatorStatus === "Blocked" && (
        <p className="mb-8 rounded-sm bg-clay/10 p-4 text-[14px] text-clay">{L("Профиль заблокирован администратором. Туры скрыты из каталога.")}</p>
      )}
      {children}
    </CabinetShell>
  );
}
