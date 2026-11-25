"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Badge, EmptyState, Rating } from "@/components/ui";
import { useI18n } from "@/i18n/client";


type R = { id: string; author: string; rating: number; text: string; operatorReply?: string | null; createdAt: string; tourTitle?: string | null; status: "Published" | "Hidden" };

/** Модерация отзывов (FR-18): скрытые отзывы не учитываются в рейтинге. */
export default function AdminReviewsPage() {
  const { L, date } = useI18n();
  const [items, setItems] = useState<R[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => api<R[]>("/admin/reviews").then(setItems).catch((e) => setErr(errorMessage(e)));
  useEffect(() => {
    load();
  }, []);
  const set = async (id: string, status: R["status"]) => {
    try {
      await api(`/admin/reviews/${id}`, { method: "PATCH", body: { status } });
      load();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  if (items?.length === 0) return <EmptyState title={L("Отзывов пока нет")} />;
  return (
    <div className="space-y-3">
      {err && <p className="text-clay">{err}</p>}
      {items?.map((r) => (
        <article key={r.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p><b>{r.author}</b> <span className="text-[13px] text-stone">· {r.tourTitle} · {date(r.createdAt)}</span></p>
            <div className="flex items-center gap-3"><Rating value={r.rating} count={1} /><Badge tone={r.status === "Published" ? "ok" : "bad"}>{r.status === "Published" ? L("Опубликован") : L("Скрыт")}</Badge></div>
          </div>
          <p className="mt-3">{r.text}</p>
          <button onClick={() => set(r.id, r.status === "Published" ? "Hidden" : "Published")} className={`mt-3 text-[13px] font-semibold ${r.status === "Published" ? "text-clay" : "text-turquoise"}`}>
            {r.status === "Published" ? L("Скрыть отзыв") : L("Опубликовать снова")}
          </button>
        </article>
      ))}
    </div>
  );
}
