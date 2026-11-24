"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Badge } from "@/components/ui";
import { OPERATOR_KIND, VERIFICATION, date } from "@/lib/format";
import type { OperatorKind, Verification } from "@/lib/types";

type O = { id: string; name: string; kind: OperatorKind; verification: Verification; email: string; toursCount: number; rating: number; isDemo: boolean; createdAt: string };

/** Модерация операторов (FR-18): проверка и блокировка. */
export default function AdminOperatorsPage() {
  const [items, setItems] = useState<O[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => api<O[]>("/admin/operators").then(setItems).catch((e) => setErr(errorMessage(e)));
  useEffect(() => {
    load();
  }, []);
  const set = async (id: string, verification: Verification) => {
    try {
      await api(`/admin/operators/${id}`, { method: "PATCH", body: { verification } });
      load();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  return (
    <div className="space-y-3">
      {err && <p className="text-clay" role="alert">{err}</p>}
      {items?.map((o) => (
        <div key={o.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={o.verification === "Verified" ? "ok" : o.verification === "Blocked" ? "bad" : "warn"}>{VERIFICATION[o.verification]}</Badge>
              {o.isDemo && <Badge>Демо</Badge>}
            </div>
            <p className="mt-1.5 font-display text-xl text-forest">{o.name}</p>
            <p className="text-[13px] text-stone">{OPERATOR_KIND[o.kind]} · {o.email} · туров: {o.toursCount} · рейтинг: {o.rating > 0 ? o.rating.toFixed(1) : "нет"} · с {date(o.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            {o.verification !== "Verified" && <button onClick={() => set(o.id, "Verified")} className="btn-accent !py-2">Подтвердить</button>}
            {o.verification !== "Blocked" && <button onClick={() => set(o.id, "Blocked")} className="btn-danger !py-2">Заблокировать</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
