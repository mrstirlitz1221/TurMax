import type { Metadata } from "next";
import { apiGetRequired } from "@/lib/api-server";
import type { MapPoint } from "@/lib/types";
import { ExplorerMap } from "@/components/map/ExplorerMap";

export const metadata: Metadata = {
  title: "Интерактивная карта",
  description: "Карта туристических мест Кыргызстана: направления, озёра, перевалы, памятники истории и горячие источники.",
};

export default async function MapPage() {
  const points = await apiGetRequired<MapPoint[]>("/map/points");
  return <ExplorerMap points={points} />;
}
