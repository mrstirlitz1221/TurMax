"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import type { Favorite } from "@/lib/types";
import { DestinationCard, TourCard } from "@/components/cards";
import { EmptyState } from "@/components/ui";
import { useI18n } from "@/i18n/client";

export default function FavoritesPage() {
  const { L } = useI18n();
  const [items, setItems] = useState<Favorite[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Favorite[]>("/favorites").then(setItems).catch((e) => setErr(errorMessage(e)));
  }, []);
  if (err) return <p className="text-clay">{err}</p>;
  if (!items) return <p className="text-stone">{L("Загрузка…")}</p>;
  if (items.length === 0)
    return <EmptyState title={L("В избранном пусто")} text={L("Нажмите на сердечко на карточке тура или направления, чтобы сохранить его.")} action={<Link href="/destinations" className="btn-primary">{L("К направлениям")}</Link>} />;
  const tours = items.filter((f) => f.tour);
  const dests = items.filter((f) => f.destination);
  return (
    <div className="space-y-14">
      {dests.length > 0 && (
        <div>
          <h2 className="mb-5 font-display text-2xl text-forest">{L("Направления")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{dests.map((f) => <DestinationCard key={f.id} d={f.destination!} />)}</div>
        </div>
      )}
      {tours.length > 0 && (
        <div>
          <h2 className="mb-5 font-display text-2xl text-forest">{L("Маршруты")}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{tours.map((f) => <TourCard key={f.id} t={f.tour!} />)}</div>
        </div>
      )}
    </div>
  );
}
