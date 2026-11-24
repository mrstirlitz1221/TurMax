"use client";

import { Map } from "@/components/map/Map";
import type { MapPoint } from "@/lib/types";

export function HomeMap({ points }: { points: MapPoint[] }) {
  return (
    <Map
      markers={points.map((p) => ({
        id: p.id, name: p.name, lat: p.latitude, lng: p.longitude, type: p.type, kind: p.kind,
        summary: p.summary, imageUrl: p.imageUrl, url: p.url,
      }))}
      zoom={6}
    />
  );
}
