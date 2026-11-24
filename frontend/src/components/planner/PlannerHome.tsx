"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { dateTime, days, plural } from "@/lib/format";
import type { RouteSummary, UserRoute } from "@/lib/types";
import { EmptyState } from "@/components/ui";

/** Список сохранённых маршрутов (FR-07) и создание нового. ?add=<poiId> создаёт маршрут с выбранной точкой. */
export function PlannerHome() {
  const router = useRouter();
  const sp = useSearchParams();
  const [routes, setRoutes] = useState<RouteSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handledAdd = useRef(false);

  const load = useCallback(() => api<RouteSummary[]>("/routes").then(setRoutes).catch((e) => setErr(errorMessage(e))), []);

  const create = useCallback(
    async (poiId?: string) => {
      setBusy(true);
      try {
        const r = await api<UserRoute>("/routes", { body: { title: "Мой маршрут", participants: 2, vehicleType: "Minivan", withGuide: true } });
        if (poiId) await api(`/routes/${r.id}/points`, { method: "PUT", body: { points: [{ poiId, day: 1, nights: 0 }] } });
        router.push(`/planner/${r.id}`);
      } catch (e) {
        setErr(errorMessage(e));
        setBusy(false);
      }
    },
    [router],
  );

  useEffect(() => {
    const add = sp.get("add");
    if (add && !handledAdd.current) {
      handledAdd.current = true;
      create(add);
    } else load();
  }, [sp, create, load]);

  const remove = async (id: string) => {
    if (!confirm("Удалить маршрут? Действие нельзя отменить.")) return;
    try {
      await api(`/routes/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  const copy = async (id: string) => {
    try {
      const r = await api<UserRoute>(`/routes/${id}/copy`, { method: "POST" });
      router.push(`/planner/${r.id}`);
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  return (
    <section className="container-x pt-[calc(var(--header-h)+40px)] pb-24">
      <p className="eyebrow text-turquoise">Конструктор маршрута</p>
      <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="h-display text-[44px] text-forest sm:text-[60px]">Мои маршруты</h1>
          <p className="mt-3 max-w-xl text-stone">Соберите поездку из точек на карте, распределите по дням и получите смету по тарифам оператора.</p>
        </div>
        <button onClick={() => create()} disabled={busy} className="btn-accent !px-6 !py-3.5">
          <Plus size={18} /> {busy ? "Создаём…" : "Новый маршрут"}
        </button>
      </div>
      {err && <p className="mt-6 text-clay" role="alert">{err}</p>}
      <div className="mt-12">
        {routes === null ? (
          <p className="text-stone">Загрузка…</p>
        ) : routes.length === 0 ? (
          <EmptyState title="Маршрутов пока нет" text="Создайте первый маршрут — например, кольцо вокруг Иссык-Куля на три дня." action={<button onClick={() => create()} className="btn-primary">Создать маршрут</button>} />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {routes.map((r) => (
              <li key={r.id} className="card group overflow-hidden">
                <Link href={`/planner/${r.id}`} className="block">
                  <div className="relative aspect-[16/9] bg-forest">
                    {r.cover && <Image src={r.cover} alt="" fill sizes="33vw" className="object-cover opacity-90 transition duration-700 group-hover:scale-105" />}
                  </div>
                  <div className="p-5">
                    <p className="font-display text-2xl text-forest">{r.title}</p>
                    <p className="mt-1 text-[13.5px] text-stone">
                      {r.days ? days(r.days) : "Без точек"} · {r.pointsCount} {plural(r.pointsCount, "точка", "точки", "точек")} · {r.participants} чел.
                    </p>
                    <p className="mt-1 text-[12px] text-stone/80">Изменён {dateTime(r.updatedAt)}</p>
                  </div>
                </Link>
                <div className="flex gap-2 border-t border-graphite/8 px-5 py-3">
                  <button onClick={() => copy(r.id)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest hover:text-turquoise"><Copy size={14} /> Копировать</button>
                  <button onClick={() => remove(r.id)} className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-clay"><Trash2 size={14} /> Удалить</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
