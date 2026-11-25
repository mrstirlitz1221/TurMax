"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Notification } from "@/lib/types";
import { CabinetShell } from "./shared";
import { useI18n } from "@/i18n/client";

export function AccountShell({ children }: { children: React.ReactNode }) {
  const { L } = useI18n();
  const { user } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    api<Notification[]>("/notifications").then((n) => setUnread(n.filter((x) => !x.isRead).length)).catch(() => {});
  }, [pathname]);
  return (
    <CabinetShell
      title={L("Личный кабинет")}
      subtitle={user ? `${user.fullName} · ${user.email}` : undefined}
      tabs={[
        { href: "/account", label: L("Заявки") },
        { href: "/planner", label: L("Мои маршруты") },
        { href: "/account/favorites", label: L("Избранное") },
        { href: "/account/notifications", label: L("Уведомления"), badge: unread },
        { href: "/account/profile", label: L("Профиль") },
      ]}
    >
      {children}
    </CabinetShell>
  );
}
