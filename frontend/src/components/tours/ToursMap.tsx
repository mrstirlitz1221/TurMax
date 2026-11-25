"use client";

import { Map } from "@/components/map/Map";

import type { TourCard } from "@/lib/types";
import { useI18n } from "@/i18n/client";

export function ToursMap({ tours }: { tours: TourCard[] }) {
  const { L, som, days } = useI18n();
  const markers = tours
    .filter((t) => t.keyLatitude && t.keyLongitude)
    .map((t) => ({
      id: t.id, name: t.title, lat: t.keyLatitude!, lng: t.keyLongitude!, type: "destination" as const,
      summary: `${days(t.days)} · ${L("от {price}", { price: som(t.priceFrom) })} · ${t.region}`, imageUrl: t.cover?.url, url: `/tours/${t.slug}`,
    }));
  return <Map markers={markers} />;
}
