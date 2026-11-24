"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api, errorMessage, HttpError } from "@/lib/api-client";
import { useAuth } from "@/components/auth/AuthProvider";
import { date, som } from "@/lib/format";
import type { Booking, Departure } from "@/lib/types";
import { DemoNote } from "@/components/ui";

const PHONE = /^\+?[0-9\s()-]{9,20}$/;

/** Заявка на выезд готового тура (FR-08): не более пяти шагов от выбора маршрута (НФТ). */
export function BookingPanel({ departures, tourSlug }: { departures: Departure[]; tourSlug: string }) {
  const { user, ready } = useAuth();
  const [depId, setDepId] = useState(departures.find((d) => d.seatsAvailable > 0)?.id ?? "");
  const [n, setN] = useState(1);
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);

  const dep = departures.find((d) => d.id === depId);

  if (departures.length === 0)
    return (
      <div className="card p-6">
        <p className="font-display text-xl text-forest">Ближайших выездов нет</p>
        <p className="mt-2 text-[14px] text-stone">Соберите похожий маршрут в конструкторе — оператор подтвердит даты индивидуально.</p>
        <Link href="/planner" className="btn-primary mt-5 w-full">Открыть конструктор</Link>
      </div>
    );

  if (done)
    return (
      <div className="card p-6" role="status">
        <CheckCircle2 className="text-turquoise" size={32} />
        <p className="mt-3 font-display text-2xl text-forest">Заявка отправлена</p>
        <p className="mt-2 text-[14.5px] text-stone">
          Оператор рассмотрит её в течение 72 часов. Статус и ответ появятся в личном кабинете.
        </p>
        <Link href={`/account/bookings/${done.id}`} className="btn-primary mt-5 w-full">Открыть заявку</Link>
      </div>
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!dep) errs.dep = "Выберите дату выезда";
    else if (n > dep.seatsAvailable) errs.n = `Свободно мест: ${dep.seatsAvailable}`;
    if (n < 1 || n > 50) errs.n = "От 1 до 50 участников";
    if (!PHONE.test(phone.trim())) errs.phone = "Укажите телефон в формате +996 555 123 456";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      setDone(await api<Booking>("/bookings", { body: { departureId: depId, participants: n, contactPhone: phone.trim(), comment: comment.trim() || null } }));
    } catch (e) {
      setErrors({ form: e instanceof HttpError ? e.message : errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-6" noValidate>
      <p className="text-[12.5px] text-stone">Цена за человека</p>
      <p className="font-display text-3xl text-forest">{dep ? som(dep.price) : "—"}</p>

      <fieldset className="mt-5">
        <legend className="label">Дата выезда</legend>
        <div className="grid gap-2">
          {departures.slice(0, 6).map((d) => (
            <label key={d.id} className={`flex cursor-pointer items-center justify-between rounded-sm border px-3 py-2.5 text-[14px] transition ${depId === d.id ? "border-forest bg-sand-light" : "border-graphite/12 hover:border-forest/50"} ${d.seatsAvailable === 0 ? "pointer-events-none opacity-45" : ""}`}>
              <span className="flex items-center gap-2.5">
                <input type="radio" name="dep" value={d.id} checked={depId === d.id} onChange={() => setDepId(d.id)} disabled={d.seatsAvailable === 0} className="accent-forest" />
                {date(d.startDate, { day: "numeric", month: "long", year: "numeric" })}
              </span>
              <span className="text-[12.5px] text-stone">{d.seatsAvailable > 0 ? `мест: ${d.seatsAvailable}` : "нет мест"}</span>
            </label>
          ))}
        </div>
        {errors.dep && <p className="mt-1.5 text-[13px] text-clay">{errors.dep}</p>}
      </fieldset>

      {!ready ? null : !user ? (
        <div className="mt-6 rounded-sm bg-sand-light p-4 text-[14px]">
          <p>Чтобы отправить заявку, войдите или зарегистрируйтесь — это займёт минуту.</p>
          <div className="mt-3 flex gap-2">
            <Link href={`/login?next=/tours/${tourSlug}`} className="btn-primary flex-1 !py-2.5">Войти</Link>
            <Link href={`/register?next=/tours/${tourSlug}`} className="btn-outline flex-1 !py-2.5">Регистрация</Link>
          </div>
        </div>
      ) : user.role !== "Tourist" ? (
        <p className="mt-6 rounded-sm bg-sand-light p-4 text-[14px] text-stone">Заявки отправляют туристы. Вы вошли как {user.role === "Admin" ? "администратор" : "оператор"}.</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-[110px_1fr] gap-3">
            <div>
              <label htmlFor="b-n" className="label">Участников</label>
              <input id="b-n" type="number" min={1} max={50} value={n} onChange={(e) => setN(Number(e.target.value))} className="field" aria-invalid={!!errors.n} />
            </div>
            <div>
              <label htmlFor="b-phone" className="label">Телефон</label>
              <input id="b-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+996 …" className="field" aria-invalid={!!errors.phone} />
            </div>
          </div>
          {(errors.n || errors.phone) && <p className="mt-1.5 text-[13px] text-clay">{errors.n ?? errors.phone}</p>}
          <label htmlFor="b-c" className="label mt-4">Пожелания</label>
          <textarea id="b-c" rows={2} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} className="field" placeholder="Необязательно" />
          {dep && (
            <div className="mt-5 flex items-baseline justify-between border-t border-graphite/8 pt-4">
              <span className="text-[14px] text-stone">Итого за {n} чел.</span>
              <span className="text-xl font-bold">{som(dep.price * Math.max(n, 1))}</span>
            </div>
          )}
          {errors.form && <p className="mt-3 text-[13.5px] text-clay" role="alert">{errors.form}</p>}
          <button type="submit" disabled={busy} className="btn-accent mt-5 w-full !py-3.5">
            {busy ? "Отправляем…" : "Отправить заявку"}
          </button>
        </>
      )}
      <DemoNote className="mt-4" />
    </form>
  );
}
