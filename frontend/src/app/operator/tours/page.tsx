"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Badge, EmptyState } from "@/components/ui";
import { TOUR_STATUS } from "@/lib/format";
import type { TourStatus } from "@/lib/types";
import { useI18n } from "@/i18n/client";

type Row = { id: string; slug: string; title: string; status: TourStatus; moderationNote?: string | null; days: number; priceFrom: number; views: number; departuresCount: number; bookingsCount: number; cover?: string | null };
const TONE: Record<TourStatus, "neutral" | "info" | "warn" | "ok" | "bad"> = { Draft: "neutral", Pending: "info", Published: "ok", Rejected: "bad", Hidden: "warn" };

export default function OperatorToursPage() {
  const { L, som, days } = useI18n();
  const [items, setItems] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Row[]>("/operator/tours").then(setItems).catch((e) => setErr(errorMessage(e)));
  }, []);
  return (
    <div>
      <div className="mb-6 flex justify-end"><Link href="/operator/tours/new" className="btn-accent"><Plus size={16} /> {L("Новый тур")}</Link></div>
      {err && <p className="text-clay">{err}</p>}
      {!items ? <p className="text-stone">{L("Загрузка…")}</p> : items.length === 0 ? (
        <EmptyState title={L("Туров пока нет")} text={L("Создайте первый тур: программу по точкам, фотографии и выезды с ценой и количеством мест.")} />
      ) : (
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t.id}>
              <Link href={`/operator/tours/${t.id}`} className="card flex gap-4 p-3 transition hover:border-forest/40">
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xs bg-mist">{t.cover && <Image src={t.cover} alt="" fill sizes="112px" className="object-cover" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><Badge tone={TONE[t.status]}>{L(TOUR_STATUS[t.status])}</Badge></div>
                  <p className="mt-1 truncate font-display text-xl text-forest">{t.title}</p>
                  <p className="text-[13px] text-stone">{days(t.days)} {L("· от")} {som(t.priceFrom)} {L("· выездов:")} {t.departuresCount} {L("· заявок:")} {t.bookingsCount} {L("· просмотров:")} {t.views}</p>
                  {t.moderationNote && t.status === "Rejected" && <p className="mt-1 text-[13px] text-clay">{L("Причина:")} {t.moderationNote}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
