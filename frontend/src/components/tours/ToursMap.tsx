"use client";

import { Map } from "@/components/map/Map";
import { days, som } from "@/lib/format";
import type { TourCard } from "@/lib/types";

export function ToursMap({ tours }: { tours: TourCard[] }) {
  const markers = tours
    .filter((t) => t.keyLatitude && t.keyLongitude)
    .map((t) => ({
      id: t.id, name: t.title, lat: t.keyLatitude!, lng: t.keyLongitude!, type: "destination" as const,
      summary: `${days(t.days)} · от ${som(t.priceFrom)} · ${t.region}`, imageUrl: t.cover?.url, url: `/tours/${t.slug}`,
    }));
  return <Map markers={markers} />;
}
