"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import type { Booking } from "@/lib/types";
import { BookingRow } from "@/components/account/shared";
import { EmptyState } from "@/components/ui";
import { useI18n } from "@/i18n/client";

export default function AccountBookingsPage() {
  const { L } = useI18n();
  const [items, setItems] = useState<Booking[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Booking[]>("/bookings/my").then(setItems).catch((e) => setErr(errorMessage(e)));
  }, []);

  if (err) return <p className="text-clay" role="alert">{err}</p>;
  if (!items) return <p className="text-stone">{L("Загрузка…")}</p>;
  if (items.length === 0)
    return (
      <EmptyState
        title={L("Заявок пока нет")}
        text={L("Выберите готовый тур в каталоге или соберите свой маршрут в конструкторе.")}
        action={<div className="flex gap-3"><Link href="/tours" className="btn-primary">{L("Каталог маршрутов")}</Link><Link href="/planner" className="btn-outline">{L("Конструктор")}</Link></div>}
      />
    );
  const active = items.filter((b) => ["New", "InReview", "PriceChanged", "Confirmed"].includes(b.status));
  const past = items.filter((b) => !active.includes(b));
  return (
    <div className="space-y-12">
      {active.length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-2xl text-forest">{L("Активные")}</h2>
          <ul className="space-y-3">{active.map((b) => <BookingRow key={b.id} b={b} href={`/account/bookings/${b.id}`} />)}</ul>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h2 className="mb-4 font-display text-2xl text-forest">{L("История")}</h2>
          <ul className="space-y-3">{past.map((b) => <BookingRow key={b.id} b={b} href={`/account/bookings/${b.id}`} />)}</ul>
        </div>
      )}
    </div>
  );
}
