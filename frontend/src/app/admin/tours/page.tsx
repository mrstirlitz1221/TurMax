"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Badge } from "@/components/ui";
import { TOUR_STATUS, dateTime } from "@/lib/format";
import type { TourStatus } from "@/lib/types";

type T = { id: string; slug: string; title: string; operatorName: string; status: TourStatus; moderationNote?: string | null; updatedAt: string };

/** Модерация туров (FR-18). */
export default function AdminToursPage() {
  const [items, setItems] = useState<T[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const load = () => api<T[]>("/admin/tours").then(setItems).catch((e) => setErr(errorMessage(e)));
  useEffect(() => {
    load();
  }, []);
  const set = async (id: string, status: TourStatus) => {
    if (status === "Rejected" && !notes[id]?.trim()) return setErr("Укажите причину отклонения");
    try {
      await api(`/admin/tours/${id}`, { method: "PATCH", body: { status, note: notes[id]?.trim() || null } });
      setErr(null);
      load();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  return (
    <div className="space-y-3">
      {err && <p className="text-clay" role="alert">{err}</p>}
      {items?.map((t) => (
        <div key={t.id} className={`card p-5 ${t.status === "Pending" ? "border-turquoise/50" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={t.status === "Published" ? "ok" : t.status === "Pending" ? "info" : t.status === "Rejected" ? "bad" : "neutral"}>{TOUR_STATUS[t.status]}</Badge>
            <span className="text-[12.5px] text-stone">{t.operatorName} · изменён {dateTime(t.updatedAt)}</span>
          </div>
          <p className="mt-1.5 font-display text-xl text-forest">{t.title}</p>
          {t.status === "Published" && <Link href={`/tours/${t.slug}`} className="text-[13px] text-turquoise underline">Открыть на сайте</Link>}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input aria-label="Комментарий модератора" className="field !py-2" placeholder="Комментарий / причина отклонения" value={notes[t.id] ?? ""} onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })} />
            {t.status !== "Published" && <button onClick={() => set(t.id, "Published")} className="btn-accent shrink-0 !py-2">Опубликовать</button>}
            {t.status !== "Rejected" && <button onClick={() => set(t.id, "Rejected")} className="btn-danger shrink-0 !py-2">Отклонить</button>}
            {t.status === "Published" && <button onClick={() => set(t.id, "Hidden")} className="btn-outline shrink-0 !py-2">Скрыть</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
