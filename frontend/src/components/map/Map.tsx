"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/i18n/client";

function MapLoading() {
  const { L } = useI18n();
  return <div className="grid h-full min-h-[300px] w-full animate-pulse place-items-center bg-mist text-sm text-stone">{L("Загрузка карты…")}</div>;
}

// Leaflet работает только в браузере — загружаем карту без SSR.
export const Map = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <MapLoading />,
});
export type { MapMarker } from "./LeafletMap";
