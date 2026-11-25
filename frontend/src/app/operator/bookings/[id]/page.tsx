"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import type { Booking } from "@/lib/types";
import { HistoryTimeline, StatusBadge } from "@/components/account/shared";
import { useI18n } from "@/i18n/client";


type Detail = { booking: Booking; routePoints: { day: number; nights: number; name: string; slug: string }[] | null };

/** Обработка заявки оператором (FR-15): подтверждение, отклонение с причиной, корректировка цены. */
export default function OperatorBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { L, som, date } = useI18n();
  const { id } = use(params);
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Detail>(`/operator/bookings/${id}`).then(setD).catch((e) => setErr(errorMessage(e)));
  }, [id]);

  const act = async (action: "confirm" | "reject" | "changePrice") => {
    if (action === "reject" && !note.trim()) return setErr(L("Укажите причину отклонения в комментарии"));
    if (action === "changePrice" && !(Number(price) > 0)) return setErr(L("Укажите новую цену"));
    setBusy(true);
    setErr(null);
    try {
      const b = await api<Booking>(`/operator/bookings/${id}`, { method: "PATCH", body: { action, note: note.trim() || null, price: action === "changePrice" ? Number(price) : null } });
      setD((cur) => (cur ? { ...cur, booking: b } : cur));
      setNote("");
      setPrice("");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!d) return err ? <p className="text-clay">{err}</p> : <p className="text-stone">{L("Загрузка…")}</p>;
  const b = d.booking;
  const open = b.status === "New" || b.status === "InReview";

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
      <div>
        <Link href="/operator/bookings" className="text-[13px] text-stone hover:text-forest">{L("← Все заявки")}</Link>
        <div className="mt-4 flex items-center gap-3"><StatusBadge status={b.status} /><span className="text-[13px] text-stone">{b.departureId ? L("Готовый тур") : L("Свой маршрут туриста")}</span></div>
        <h2 className="mt-2 font-display text-4xl text-forest">{b.title}</h2>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          {[
            [L("Турист"), `${b.touristName} · ${b.touristEmail}`],
            [L("Телефон"), b.contactPhone],
            [L("Даты"), `${date(b.startDate)} — ${date(b.endDate)}`],
            [L("Участников"), b.participants],
          ].map(([k, v]) => (
            <div key={k as string}><dt className="text-[12px] font-semibold tracking-wider text-stone uppercase">{k}</dt><dd className="mt-1">{v}</dd></div>
          ))}
        </dl>
        {b.comment && <p className="mt-6 rounded-sm bg-white p-4"><b>{L("Пожелания туриста:")}</b> {b.comment}</p>}
        {d.routePoints && (
          <div className="mt-8">
            <h3 className="mb-3 font-display text-xl text-forest">{L("Маршрут туриста")}</h3>
            <ol className="space-y-1.5 text-[14.5px]">
              {d.routePoints.map((p, i) => (
                <li key={i} className="flex gap-3"><span className="w-16 shrink-0 text-stone">{L("День")} {p.day}</span><Link href={`/attractions/${p.slug}`} className="hover:underline">{p.name}</Link>{p.nights > 0 && <span className="text-stone">{L("· ночёвок:")} {p.nights}</span>}</li>
              ))}
            </ol>
          </div>
        )}
        <div className="mt-10">
          <h3 className="mb-4 font-display text-xl text-forest">{L("История")}</h3>
          <HistoryTimeline items={b.history} />
        </div>
      </div>
      <aside className="card h-fit space-y-4 p-6">
        <div>
          <p className="text-[12.5px] text-stone">{L("Цена по смете")}</p>
          <p className="font-display text-3xl text-forest">{som(b.priceCalc)}</p>
          {b.priceFinal && <p className="text-[14px]">{L("Подтверждённая цена:")} <b>{som(b.priceFinal)}</b></p>}
        </div>
        {open ? (
          <>
            <div>
              <label htmlFor="op-note" className="label">{L("Комментарий туристу")}</label>
              <textarea id="op-note" rows={3} maxLength={2000} className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder={L("Обязателен при отклонении")} />
            </div>
            <button disabled={busy} onClick={() => act("confirm")} className="btn-accent w-full">{L("Подтвердить")}</button>
            <div className="flex gap-2">
              <input type="number" min={1} aria-label={L("Новая цена")} placeholder={L("Новая цена, сом")} className="field" value={price} onChange={(e) => setPrice(e.target.value)} />
              <button disabled={busy} onClick={() => act("changePrice")} className="btn-outline shrink-0">{L("Изменить цену")}</button>
            </div>
            <button disabled={busy} onClick={() => act("reject")} className="btn-danger w-full">{L("Отклонить")}</button>
          </>
        ) : (
          <p className="text-[14px] text-stone">
            {b.status === "PriceChanged" ? L("Ожидаем согласия туриста с новой ценой.") : L("Заявка обработана — действия недоступны.")}
          </p>
        )}
        {err && <p className="text-[13.5px] text-clay" role="alert">{err}</p>}
      </aside>
    </div>
  );
}
