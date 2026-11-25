import type { Metadata } from "next";
import { apiGetRequired } from "@/lib/api-server";
import type { MapPoint } from "@/lib/types";
import { ExplorerMap } from "@/components/map/ExplorerMap";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return {
    title: L("Интерактивная карта"),
    description: L("Карта туристических мест Кыргызстана: направления, озёра, перевалы, памятники истории и горячие источники."),
  };
}

export default async function MapPage() {
  const points = await apiGetRequired<MapPoint[]>("/map/points");
  return <ExplorerMap points={points} />;
}
