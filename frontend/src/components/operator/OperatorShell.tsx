"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { CabinetShell } from "@/components/account/shared";
import { VERIFICATION } from "@/lib/format";

export function OperatorShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <CabinetShell
      title={user?.operatorName ?? "Кабинет оператора"}
      subtitle={user?.operatorStatus ? `Статус проверки: ${VERIFICATION[user.operatorStatus]}` : undefined}
      tabs={[
        { href: "/operator", label: "Обзор" },
        { href: "/operator/bookings", label: "Заявки" },
        { href: "/operator/tours", label: "Туры" },
        { href: "/operator/services", label: "Тарифы" },
        { href: "/operator/reviews", label: "Отзывы" },
        { href: "/operator/notifications", label: "Уведомления" },
        { href: "/operator/profile", label: "Профиль" },
      ]}
    >
      {user?.operatorStatus === "Pending" && (
        <p className="mb-8 rounded-sm bg-[#fbf1dc] p-4 text-[14px] text-[#6e4a0e]">
          Профиль на проверке у администратора. Вы можете готовить туры и тарифы — в каталоге они появятся после проверки и модерации.
        </p>
      )}
      {user?.operatorStatus === "Blocked" && (
        <p className="mb-8 rounded-sm bg-clay/10 p-4 text-[14px] text-clay">Профиль заблокирован администратором. Туры скрыты из каталога.</p>
      )}
      {children}
    </CabinetShell>
  );
}
