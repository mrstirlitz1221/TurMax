"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { Booking } from "@/lib/types";
import { HistoryTimeline, StatusBadge } from "@/components/account/shared";
import { date, som } from "@/lib/format";

export default function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [b, setB] = useState<Booking | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

  const load = useCallback(() => api<Booking>(`/bookings/${id}`).then(setB).catch((e) => setErr(errorMessage(e))), [id]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (path: string, body: unknown = {}) => {
    setBusy(true);
    setErr(null);
    try {
      setB(await api<Booking>(`/bookings/${id}/${path}`, { body }));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const sendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) return setReviewMsg("Отзыв — не короче 10 символов");
    setBusy(true);
    try {
      await api(`/bookings/${id}/review`, { body: { rating, text: text.trim() } });
      setReviewMsg(null);
      await load();
    } catch (e) {
      setReviewMsg(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (err && !b) return <p className="text-clay" role="alert">{err}</p>;
  if (!b) return <p className="text-stone">Загрузка…</p>;
  const canCancel = ["New", "InReview", "PriceChanged", "Confirmed"].includes(b.status) && new Date(b.startDate) > new Date();

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
      <div>
        <Link href="/account" className="text-[13px] text-stone hover:text-forest">← Все заявки</Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusBadge status={b.status} />
          <span className="text-[13px] text-stone">{b.departureId ? "Готовый тур" : "Свой маршрут"}</span>
        </div>
        <h2 className="mt-2 font-display text-4xl text-forest">{b.title}</h2>
        <dl className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {[
            ["Даты", `${date(b.startDate, { day: "numeric", month: "short" })} — ${date(b.endDate, { day: "numeric", month: "short", year: "numeric" })}`],
            ["Участников", b.participants],
            ["Оператор", b.operatorName],
            ["Телефон", b.contactPhone],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-[12px] font-semibold tracking-wider text-stone uppercase">{k}</dt>
              <dd className="mt-1 text-[15px]">{v}</dd>
            </div>
          ))}
        </dl>
        {b.comment && <p className="mt-6 rounded-sm bg-white p-4 text-[14.5px]"><b>Ваши пожелания:</b> {b.comment}</p>}
        {b.operatorNote && <p className="mt-3 rounded-sm border-l-2 border-turquoise bg-white p-4 text-[14.5px]"><b>Комментарий оператора:</b> {b.operatorNote}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {b.tourSlug && <Link href={`/tours/${b.tourSlug}`} className="btn-outline">Страница тура</Link>}
          {b.routeId && <Link href={`/planner/${b.routeId}`} className="btn-outline">Открыть маршрут</Link>}
        </div>

        {b.canReview && (
          <form onSubmit={sendReview} className="card mt-10 p-6" noValidate>
            <h3 className="font-display text-2xl text-forest">Как прошла поездка?</h3>
            <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Оценка">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} из 5`} onClick={() => setRating(n)}>
                  <Star size={28} className={n <= rating ? "fill-[#e3a83b] text-[#e3a83b]" : "text-graphite/25"} />
                </button>
              ))}
            </div>
            <label htmlFor="rv" className="label mt-4">Отзыв</label>
            <textarea id="rv" rows={4} maxLength={3000} value={text} onChange={(e) => setText(e.target.value)} className="field" placeholder="Что понравилось, что стоит учесть другим путешественникам" />
            {reviewMsg && <p className="mt-2 text-[13.5px] text-clay" role="alert">{reviewMsg}</p>}
            <button disabled={busy} className="btn-primary mt-4">Опубликовать отзыв</button>
          </form>
        )}
        {b.hasReview && <p className="mt-10 rounded-sm bg-white p-4 text-[14.5px] text-stone">Спасибо! Ваш отзыв опубликован на странице тура.</p>}
      </div>

      <aside className="space-y-6">
        <div className="card p-6">
          <p className="text-[12.5px] text-stone">{b.priceFinal && b.priceFinal !== b.priceCalc ? "Цена оператора" : "Стоимость по смете"}</p>
          <p className="font-display text-4xl text-forest">{som(b.priceFinal ?? b.priceCalc)}</p>
          {b.priceFinal && b.priceFinal !== b.priceCalc && <p className="text-[13px] text-stone line-through">{som(b.priceCalc)}</p>}
          {b.status === "PriceChanged" && (
            <div className="mt-5 rounded-sm bg-[#fbf1dc] p-4 text-[14px] text-[#6e4a0e]">
              Оператор изменил цену. Подтвердите новую стоимость или отмените заявку.
              <button disabled={busy} onClick={() => act("accept-price")} className="btn-primary mt-3 w-full">Согласиться с ценой</button>
            </div>
          )}
          {canCancel && (
            <button
              disabled={busy}
              onClick={() => confirm("Отменить заявку?") && act("cancel", { reason: "Отменена туристом" })}
              className="btn-danger mt-4 w-full"
            >
              Отменить заявку
            </button>
          )}
          {err && <p className="mt-3 text-[13.5px] text-clay" role="alert">{err}</p>}
        </div>
        <div>
          <h3 className="mb-4 font-display text-xl text-forest">История статусов</h3>
          <HistoryTimeline items={b.history} />
        </div>
      </aside>
    </div>
  );
}
