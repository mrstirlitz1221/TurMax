"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { EmptyState, Rating } from "@/components/ui";
import { date } from "@/lib/format";

type R = { id: string; author: string; rating: number; text: string; operatorReply?: string | null; createdAt: string; tourTitle?: string | null; status: string };

export default function OperatorReviewsPage() {
  const [items, setItems] = useState<R[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const load = () => api<R[]>("/operator/reviews").then(setItems).catch((e) => setErr(errorMessage(e)));
  useEffect(() => {
    load();
  }, []);
  const reply = async (id: string) => {
    const text = (drafts[id] ?? "").trim();
    if (text.length < 2) return setErr("Напишите ответ");
    try {
      await api(`/operator/reviews/${id}/reply`, { body: { text } });
      setErr(null);
      load();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  if (!items) return <p className="text-stone">Загрузка…</p>;
  if (items.length === 0) return <EmptyState title="Отзывов пока нет" text="Отзывы оставляют туристы после завершения поездки." />;
  return (
    <div className="space-y-4">
      {err && <p className="text-clay">{err}</p>}
      {items.map((r) => (
        <article key={r.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p><b>{r.author}</b> <span className="text-[13px] text-stone">· {r.tourTitle} · {date(r.createdAt)}</span></p>
            <Rating value={r.rating} count={1} />
          </div>
          <p className="mt-3">{r.text}</p>
          {r.status === "Hidden" && <p className="mt-2 text-[13px] text-clay">Скрыт модератором</p>}
          {r.operatorReply ? (
            <p className="mt-4 border-l-2 border-turquoise bg-sand-light p-3 text-[14px]"><b>Ваш ответ:</b> {r.operatorReply}</p>
          ) : (
            <div className="mt-4 flex gap-2">
              <input aria-label="Ответ на отзыв" className="field" placeholder="Ответить туристу" value={drafts[r.id] ?? ""} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} />
              <button onClick={() => reply(r.id)} className="btn-outline shrink-0">Ответить</button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
