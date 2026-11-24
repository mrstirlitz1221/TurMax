"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Badge, EmptyState } from "@/components/ui";
import { TOUR_STATUS, days, som } from "@/lib/format";
import type { TourStatus } from "@/lib/types";

type Row = { id: string; slug: string; title: string; status: TourStatus; moderationNote?: string | null; days: number; priceFrom: number; views: number; departuresCount: number; bookingsCount: number; cover?: string | null };
const TONE: Record<TourStatus, "neutral" | "info" | "warn" | "ok" | "bad"> = { Draft: "neutral", Pending: "info", Published: "ok", Rejected: "bad", Hidden: "warn" };

export default function OperatorToursPage() {
  const [items, setItems] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Row[]>("/operator/tours").then(setItems).catch((e) => setErr(errorMessage(e)));
  }, []);
  return (
    <div>
      <div className="mb-6 flex justify-end"><Link href="/operator/tours/new" className="btn-accent"><Plus size={16} /> Новый тур</Link></div>
      {err && <p className="text-clay">{err}</p>}
      {!items ? <p className="text-stone">Загрузка…</p> : items.length === 0 ? (
        <EmptyState title="Туров пока нет" text="Создайте первый тур: программу по точкам, фотографии и выезды с ценой и количеством мест." />
      ) : (
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t.id}>
              <Link href={`/operator/tours/${t.id}`} className="card flex gap-4 p-3 transition hover:border-forest/40">
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xs bg-mist">{t.cover && <Image src={t.cover} alt="" fill sizes="112px" className="object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><Badge tone={TONE[t.status]}>{TOUR_STATUS[t.status]}</Badge></div>
                  <p className="mt-1 truncate font-display text-xl text-forest">{t.title}</p>
                  <p className="text-[13px] text-stone">{days(t.days)} · от {som(t.priceFrom)} · выездов: {t.departuresCount} · заявок: {t.bookingsCount} · просмотров: {t.views}</p>
                  {t.moderationNote && t.status === "Rejected" && <p className="mt-1 text-[13px] text-clay">Причина: {t.moderationNote}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
