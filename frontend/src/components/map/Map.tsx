"use client";

import dynamic from "next/dynamic";

// Leaflet работает только в браузере — загружаем карту без SSR.
export const Map = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-[300px] w-full animate-pulse place-items-center bg-mist text-sm text-stone">Загрузка карты…</div>,
});
export type { MapMarker } from "./LeafletMap";
