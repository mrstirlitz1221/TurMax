"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { Notification } from "@/lib/types";
import { EmptyState } from "@/components/ui";
import { dateTime } from "@/lib/format";

export function NotificationsList() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Notification[]>("/notifications").then(setItems).catch((e) => setErr(errorMessage(e)));
  }, []);
  if (err) return <p className="text-clay">{err}</p>;
  if (!items) return <p className="text-stone">Загрузка…</p>;
  if (items.length === 0) return <EmptyState title="Уведомлений нет" text="Здесь появятся изменения статусов заявок." />;
  const unread = items.some((n) => !n.isRead);
  return (
    <div>
      {unread && (
        <button
          onClick={async () => {
            await api("/notifications/read-all", { method: "POST" });
            setItems(items.map((n) => ({ ...n, isRead: true })));
          }}
          className="btn-outline mb-5 !py-2"
        >
          Отметить все как прочитанные
        </button>
      )}
      <ul className="space-y-2">
        {items.map((n) => (
          <li key={n.id} className={`card flex gap-4 p-4 ${n.isRead ? "" : "border-turquoise/40 bg-[#f1faf9]"}`}>
            <Bell size={18} className={`mt-0.5 shrink-0 ${n.isRead ? "text-stone" : "text-turquoise"}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{n.title}</p>
              <p className="text-[14px] text-graphite/85">{n.body}</p>
              <p className="mt-1 text-[12px] text-stone">{dateTime(n.createdAt)}</p>
            </div>
            {n.link && <Link href={n.link} className="shrink-0 self-center text-[13px] font-semibold text-turquoise hover:underline">Открыть</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
