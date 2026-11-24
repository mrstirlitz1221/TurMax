"use client";

import { Map, type MapMarker } from "./Map";

/** Обёртка карты для серверных страниц (передаёт сериализуемые маркеры и линию). */
export function PlaceMap({ markers, line }: { markers: MapMarker[]; line?: [number, number][] }) {
  return <Map markers={markers} line={line} />;
}
