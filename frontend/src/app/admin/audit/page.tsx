"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";

import type { Paged } from "@/lib/types";
import { useI18n } from "@/i18n/client";

type A = { id: number; createdAt: string; userEmail?: string | null; action: string; entityType: string; entityId?: string | null; details?: string | null; ip?: string | null };

/** Журнал действий пользователей и администраторов (FR-20). */
export default function AuditPage() {
  const { L, dateTime } = useI18n();
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
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label={L("Фильтр по действию")}>
        {[["", L("Все")], ["auth", L("Вход и регистрация")], ["booking", L("Заявки")], ["tour", L("Туры")], ["admin", L("Администрирование")], ["service", L("Тарифы")]].map(([k, v]) => (
          <button key={k} aria-pressed={filter === k} onClick={() => { setFilter(k); setPage(1); }} className={`rounded-xs border px-3 py-1.5 text-[13px] ${filter === k ? "border-forest bg-forest text-white" : "border-graphite/15 bg-white"}`}>{v}</button>
        ))}
      </div>
      {err && <p className="text-clay">{err}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead><tr className="text-left text-[12px] text-stone uppercase"><th className="pb-2">{L("Время")}</th><th className="pb-2">{L("Пользователь")}</th><th className="pb-2">{L("Действие")}</th><th className="pb-2">{L("Объект")}</th><th className="pb-2">{L("Детали")}</th><th className="pb-2">IP</th></tr></thead>
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
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-outline !py-1.5">{L("Назад")}</button>
          <span>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="btn-outline !py-1.5">{L("Вперёд")}</button>
        </div>
      )}
    </div>
  );
}
