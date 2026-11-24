"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { dateTime } from "@/lib/format";
import type { Paged } from "@/lib/types";

type A = { id: number; createdAt: string; userEmail?: string | null; action: string; entityType: string; entityId?: string | null; details?: string | null; ip?: string | null };

/** Журнал действий пользователей и администраторов (FR-20). */
export default function AuditPage() {
  const [data, setData] = useState<Paged<A> | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Paged<A>>(`/admin/audit?page=${page}${filter ? `&action=${encodeURIComponent(filter)}` : ""}`).then(setData).catch((e) => setErr(errorMessage(e)));
  }, [page, filter]);
  const pages = data ? Math.ceil(data.total / data.pageSize) : 1;
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Фильтр по действию">
        {[["", "Все"], ["auth", "Вход и регистрация"], ["booking", "Заявки"], ["tour", "Туры"], ["admin", "Администрирование"], ["service", "Тарифы"]].map(([k, v]) => (
          <button key={k} aria-pressed={filter === k} onClick={() => { setFilter(k); setPage(1); }} className={`rounded-xs border px-3 py-1.5 text-[13px] ${filter === k ? "border-forest bg-forest text-white" : "border-graphite/15 bg-white"}`}>{v}</button>
        ))}
      </div>
      {err && <p className="text-clay">{err}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead><tr className="text-left text-[12px] text-stone uppercase"><th className="pb-2">Время</th><th className="pb-2">Пользователь</th><th className="pb-2">Действие</th><th className="pb-2">Объект</th><th className="pb-2">Детали</th><th className="pb-2">IP</th></tr></thead>
          <tbody>
            {data?.items.map((a) => (
              <tr key={a.id} className="border-t border-graphite/8 align-top">
                <td className="py-2.5 pr-3 whitespace-nowrap">{dateTime(a.createdAt)}</td>
                <td className="py-2.5 pr-3">{a.userEmail ?? "—"}</td>
                <td className={`py-2.5 pr-3 font-mono text-[12.5px] ${a.action.includes("failed") ? "text-clay" : ""}`}>{a.action}</td>
                <td className="py-2.5 pr-3">{a.entityType}</td>
                <td className="max-w-[260px] py-2.5 pr-3 break-words text-stone">{a.details}</td>
                <td className="py-2.5 text-stone">{a.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-6 flex items-center gap-3 text-[14px]">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-outline !py-1.5">Назад</button>
          <span>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="btn-outline !py-1.5">Вперёд</button>
        </div>
      )}
    </div>
  );
}
