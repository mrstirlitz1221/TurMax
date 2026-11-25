"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";

import type { Booking } from "@/lib/types";
import { useI18n } from "@/i18n/client";

/** Заявка на собственный маршрут: сервер заново считает смету и фиксирует её в заявке (п. 2.7). */
export function BookingDialog({ routeId, participants, startDate, total, onClose }: {
  routeId: string; participants: number; startDate: string; total: number; onClose: () => void; onSaved?: () => void;
}) {
  const { L, som } = useI18n();
  const [date, setDate] = useState(startDate);
  const [n, setN] = useState(participants);
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || date < tomorrow) return setErr(L("Выберите дату начала в будущем"));
    if (n < 1 || n > 50) return setErr(L("Участников — от 1 до 50"));
    if (!/^\+?[0-9\s()-]{9,20}$/.test(phone.trim())) return setErr(L("Укажите телефон в формате +996 555 123 456"));
    setBusy(true);
    setErr(null);
    try {
      setDone(await api<Booking>("/bookings", { body: { routeId, startDate: date, participants: n, contactPhone: phone.trim(), comment: comment.trim() || null } }));
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="bd-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 id="bd-title" className="font-display text-2xl text-forest">{done ? L("Заявка отправлена") : L("Заявка оператору")}</h2>
          <button onClick={onClose} aria-label={L("Закрыть")} className="grid h-9 w-9 place-items-center text-stone hover:text-forest"><X size={20} /></button>
        </div>
        {done ? (
          <div className="mt-4">
            <CheckCircle2 className="text-turquoise" size={30} />
            <p className="mt-3 text-stone">
              {L("Заявка на")} {som(done.priceCalc)} {L("отправлена оператору «")}{done.operatorName}{L("». Ответ придёт в течение 72 часов — следите за статусом в кабинете.")}
            </p>
            <Link href={`/account/bookings/${done.id}`} className="btn-primary mt-6 w-full">{L("Открыть заявку")}</Link>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="bd-date" className="label">{L("Дата начала")}</label>
                <input id="bd-date" type="date" min={tomorrow} value={date} onChange={(e) => setDate(e.target.value)} className="field" />
              </div>
              <div>
                <label htmlFor="bd-n" className="label">{L("Участников")}</label>
                <input id="bd-n" type="number" min={1} max={50} value={n} onChange={(e) => setN(Number(e.target.value))} className="field" />
              </div>
            </div>
            <div>
              <label htmlFor="bd-phone" className="label">{L("Контактный телефон")}</label>
              <input id="bd-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+996 …" className="field" />
            </div>
            <div>
              <label htmlFor="bd-c" className="label">{L("Пожелания")}</label>
              <textarea id="bd-c" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className="field" />
            </div>
            <p className="text-[13px] text-stone">{L("Текущая смета:")} <b>{som(total)}</b>{L(". При изменении даты или числа участников сервер пересчитает цену.")}</p>
            {err && <p className="text-[13.5px] text-clay" role="alert">{err}</p>}
            <button type="submit" disabled={busy} className="btn-accent w-full !py-3.5">{busy ? L("Отправляем…") : L("Отправить заявку")}</button>
          </form>
        )}
      </div>
    </div>
  );
}
