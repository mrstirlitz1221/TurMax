"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import type { Booking, BookingStatus } from "@/lib/types";
import { BookingRow } from "@/components/account/shared";
import { EmptyState } from "@/components/ui";
import { BOOKING_STATUS } from "@/lib/format";

const FILTERS: (BookingStatus | "")[] = ["", "New", "InReview", "PriceChanged", "Confirmed", "Completed", "Rejected", "Cancelled"];

export default function OperatorBookingsPage() {
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [items, setItems] = useState<Booking[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setItems(null);
    api<Booking[]>(`/operator/bookings${status ? `?status=${status}` : ""}`).then(setItems).catch((e) => setErr(errorMessage(e)));
  }, [status]);
  return (
    <div>
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto" role="group" aria-label="Фильтр по статусу">
        {FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={status === f} onClick={() => setStatus(f)} className={`shrink-0 rounded-xs border px-3 py-1.5 text-[13px] ${status === f ? "border-forest bg-forest text-white" : "border-graphite/15 bg-white"}`}>
            {f ? BOOKING_STATUS[f] : "Все"}
          </button>
        ))}
      </div>
      {err && <p className="text-clay">{err}</p>}
      {!items ? (
        <p className="text-stone">Загрузка…</p>
      ) : items.length === 0 ? (
        <EmptyState title="Заявок нет" text="Когда туристы отправят заявки на ваши туры или маршруты по вашим тарифам, они появятся здесь." />
      ) : (
        <ul className="space-y-3">{items.map((b) => <BookingRow key={b.id} b={b} href={`/operator/bookings/${b.id}`} showTourist />)}</ul>
      )}
    </div>
  );
}
