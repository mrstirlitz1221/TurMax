"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Notification } from "@/lib/types";
import { CabinetShell } from "./shared";

export function AccountShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    api<Notification[]>("/notifications").then((n) => setUnread(n.filter((x) => !x.isRead).length)).catch(() => {});
  }, [pathname]);
  return (
    <CabinetShell
      title="Личный кабинет"
      subtitle={user ? `${user.fullName} · ${user.email}` : undefined}
      tabs={[
        { href: "/account", label: "Заявки" },
        { href: "/planner", label: "Мои маршруты" },
        { href: "/account/favorites", label: "Избранное" },
        { href: "/account/notifications", label: "Уведомления", badge: unread },
        { href: "/account/profile", label: "Профиль" },
      ]}
    >
      {children}
    </CabinetShell>
  );
}
