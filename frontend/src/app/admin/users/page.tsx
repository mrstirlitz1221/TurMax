"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/ui";

import type { Role } from "@/lib/types";
import { useI18n } from "@/i18n/client";

type U = { id: string; email: string; fullName: string; role: Role; isBlocked: boolean; createdAt: string; operatorName?: string | null };
const ROLE: Record<Role, string> = { Tourist: "Турист", Operator: "Оператор", Admin: "Администратор" };

/** Управление пользователями и ролями (FR-17). */
export default function AdminUsersPage() {
  const { L, date } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<U[] | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback((query = "") => api<U[]>(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`).then(setItems).catch((e) => setErr(errorMessage(e))), []);
  useEffect(() => {
    load();
  }, [load]);
  const update = async (id: string, body: { role?: Role; isBlocked?: boolean }) => {
    try {
      await api(`/admin/users/${id}`, { method: "PATCH", body });
      setErr(null);
      load(q);
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); load(q.trim()); }} className="mb-6 flex max-w-md gap-2" role="search">
        <input className="field" aria-label={L("Поиск пользователя")} placeholder={L("E-mail или имя")} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-outline">{L("Найти")}</button>
      </form>
      {err && <p className="mb-4 text-clay" role="alert">{err}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[14px]">
          <thead><tr className="text-left text-[12px] text-stone uppercase"><th className="pb-2">{L("Пользователь")}</th><th className="pb-2">{L("Роль")}</th><th className="pb-2">{L("Регистрация")}</th><th className="pb-2">{L("Статус")}</th><th /></tr></thead>
          <tbody>
            {items?.map((u) => (
              <tr key={u.id} className="border-t border-graphite/8">
                <td className="py-3"><b>{u.fullName}</b><span className="block text-[12.5px] text-stone">{u.email}{u.operatorName && ` · ${u.operatorName}`}</span></td>
                <td className="py-3">
                  <select aria-label={L("Роль {email}", { email: u.email })} disabled={u.id === user?.id} value={u.role} onChange={(e) => update(u.id, { role: e.target.value as Role })} className="field !w-auto !py-1 text-[13px]">
                    {Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}
                  </select>
                </td>
                <td className="py-3 text-stone">{date(u.createdAt)}</td>
                <td className="py-3">{u.isBlocked ? <Badge tone="bad">{L("Заблокирован")}</Badge> : <Badge tone="ok">{L("Активен")}</Badge>}</td>
                <td className="py-3 text-right">
                  {u.id !== user?.id && (
                    <button onClick={() => update(u.id, { isBlocked: !u.isBlocked })} className={`text-[13px] font-semibold ${u.isBlocked ? "text-turquoise" : "text-clay"}`}>
                      {u.isBlocked ? L("Разблокировать") : L("Заблокировать")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
