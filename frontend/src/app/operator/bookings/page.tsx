"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import type { Booking, BookingStatus } from "@/lib/types";
import { BookingRow } from "@/components/account/shared";
import { EmptyState } from "@/components/ui";
import { BOOKING_STATUS } from "@/lib/format";
import { useI18n } from "@/i18n/client";

const FILTERS: (BookingStatus | "")[] = ["", "New", "InReview", "PriceChanged", "Confirmed", "Completed", "Rejected", "Cancelled"];

export default function OperatorBookingsPage() {
  const { L } = useI18n();
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [items, setItems] = useState<Booking[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setItems(null);
    api<Booking[]>(`/operator/bookings${status ? `?status=${status}` : ""}`).then(setItems).catch((e) => setErr(errorMessage(e)));
  }, [status]);
  return (
    <div>
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto" role="group" aria-label={L("Фильтр по статусу")}>
        {FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={status === f} onClick={() => setStatus(f)} className={`shrink-0 rounded-xs border px-3 py-1.5 text-[13px] ${status === f ? "border-forest bg-forest text-white" : "border-graphite/15 bg-white"}`}>
            {f ? L(BOOKING_STATUS[f]) : L("Все")}
          </button>
        ))}
      </div>
      {err && <p className="text-clay">{err}</p>}
      {!items ? (
        <p className="text-stone">{L("Загрузка…")}</p>
      ) : items.length === 0 ? (
        <EmptyState title={L("Заявок нет")} text={L("Когда туристы отправят заявки на ваши туры или маршруты по вашим тарифам, они появятся здесь.")} />
      ) : (
        <ul className="space-y-3">{items.map((b) => <BookingRow key={b.id} b={b} href={`/operator/bookings/${b.id}`} showTourist />)}</ul>
      )}
    </div>
  );
}
