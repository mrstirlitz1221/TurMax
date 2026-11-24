"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { List, Map as MapIcon, Search } from "lucide-react";
import { Map } from "./Map";
import { POI_KIND } from "@/lib/format";
import type { MapPoint, PoiKind } from "@/lib/types";

const KIND_GROUPS: { key: string; label: string; kinds?: PoiKind[]; type?: "destination" }[] = [
  { key: "all", label: "Все" },
  { key: "dest", label: "Направления", type: "destination" },
  { key: "water", label: "Озёра и водопады", kinds: ["Lake", "Waterfall"] },
  { key: "nature", label: "Природа и горы", kinds: ["Nature", "Peak", "Gorge", "Pass", "HotSpring"] },
  { key: "history", label: "История и музеи", kinds: ["Monument", "Museum"] },
  { key: "city", label: "Города", kinds: ["City"] },
];

/** Полноэкранная карта (FR-03: поиск по карте). На мобильных карта и список переключаются вкладками (п. 2.8). */
export function ExplorerMap({ points }: { points: MapPoint[] }) {
  const [group, setGroup] = useState("all");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [tab, setTab] = useState<"map" | "list">("map");

  const filtered = useMemo(() => {
    const g = KIND_GROUPS.find((x) => x.key === group)!;
    const s = q.trim().toLowerCase();
    return points.filter(
      (p) =>
        (group === "all" || (g.type ? p.type === g.type : p.type === "poi" && g.kinds!.includes(p.kind!))) &&
        (!s || p.name.toLowerCase().includes(s) || p.summary.toLowerCase().includes(s)),
    );
  }, [points, group, q]);

  return (
    <div className="flex h-[100svh] flex-col pt-[var(--header-h)]">
      <h1 className="sr-only">Интерактивная карта Кыргызстана</h1>
      <div className="flex gap-1 border-b border-graphite/10 bg-white p-2 md:hidden" role="tablist">
        {(["map", "list"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex flex-1 items-center justify-center gap-2 rounded-sm py-2 text-sm font-semibold ${tab === t ? "bg-forest text-white" : "text-stone"}`}>
            {t === "map" ? <MapIcon size={16} /> : <List size={16} />} {t === "map" ? "Карта" : `Список (${filtered.length})`}
          </button>
        ))}
      </div>
      <div className="relative flex min-h-0 flex-1">
        <aside className={`${tab === "list" ? "flex" : "hidden"} w-full flex-col border-r border-graphite/10 bg-sand-light md:flex md:w-[380px]`}>
          <div className="space-y-3 border-b border-graphite/10 p-4">
            <div className="relative">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-stone" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти место" aria-label="Найти место на карте" className="field !pl-9" />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Тип мест">
              {KIND_GROUPS.map((g) => (
                <button key={g.key} type="button" aria-pressed={group === g.key} onClick={() => setGroup(g.key)} className={`rounded-xs border px-2.5 py-1 text-[12.5px] ${group === g.key ? "border-forest bg-forest text-white" : "border-graphite/15 bg-white"}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(p.id);
                    setTab("map");
                  }}
                  className={`flex w-full gap-3 border-b border-graphite/8 p-3 text-left transition hover:bg-white ${active === p.id ? "bg-white" : ""}`}
                >
                  <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xs bg-mist">
                    {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="80px" className="object-cover" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold tracking-wider text-turquoise uppercase">{p.type === "destination" ? "Направление" : POI_KIND[p.kind!]}</span>
                    <span className="block font-semibold text-forest">{p.name}</span>
                    <span className="line-clamp-1 text-[12.5px] text-stone">{p.summary}</span>
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="p-6 text-center text-stone">Ничего не найдено</li>}
          </ul>
          {active && (
            <div className="border-t border-graphite/10 bg-white p-3 text-center md:hidden">
              <Link href={points.find((p) => p.id === active)!.url} className="btn-primary w-full">Открыть страницу места</Link>
            </div>
          )}
        </aside>
        <div className={`${tab === "map" ? "block" : "hidden"} flex-1 md:block`}>
          <Map
            scrollWheelZoom
            activeId={active}
            onSelect={(m) => setActive(m.id)}
            markers={filtered.map((p) => ({ id: p.id, name: p.name, lat: p.latitude, lng: p.longitude, type: p.type, kind: p.kind, summary: p.summary, imageUrl: p.imageUrl, url: p.url }))}
          />
        </div>
      </div>
    </div>
  );
}
