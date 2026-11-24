"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, ZoomControl } from "react-leaflet";
import { POI_KIND } from "@/lib/format";
import type { PoiKind } from "@/lib/types";

export type MapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type?: "destination" | "poi";
  kind?: PoiKind | null;
  summary?: string;
  imageUrl?: string | null;
  url?: string;
  label?: string; // номер точки в маршруте
  muted?: boolean;
};

const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR = process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const KG_CENTER: [number, number] = [41.4, 74.6];

function icon(m: MapMarker, active: boolean) {
  const big = m.type === "destination" || !!m.label;
  const size = big ? 30 : 22;
  const bg = m.muted ? "#8a9590" : m.type === "destination" ? "#1d3a2c" : m.label ? "#12857f" : "#ffffff";
  const fg = m.type === "destination" || m.label || m.muted ? "#fff" : "#1d3a2c";
  const ring = active ? "0 0 0 4px rgba(31,168,160,.45)," : "";
  const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:${fg};display:grid;place-items:center;font:700 12px var(--font-sans);border:2px solid ${m.type === "poi" && !m.label ? "#1d3a2c" : "#fff"};box-shadow:${ring}0 4px 12px rgba(0,0,0,.3)">${m.label ?? ""}</div>`;
  return L.divIcon({ html, className: "tm-marker", iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2] });
}

function FitBounds({ markers, line, fit }: { markers: MapMarker[]; line?: [number, number][]; fit: boolean }) {
  const map = useMap();
  const key = markers.map((m) => m.id).join("|") + (line?.length ?? 0);
  useEffect(() => {
    if (!fit) return;
    const pts: [number, number][] = [...markers.map((m) => [m.lat, m.lng] as [number, number]), ...(line ?? [])];
    if (pts.length === 1) map.setView(pts[0], 10);
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fit]);
  return null;
}

export default function LeafletMap({
  markers,
  line,
  height = "100%",
  zoom = 7,
  fit = true,
  activeId,
  onSelect,
  actionLabel,
  onAction,
  scrollWheelZoom = false,
}: {
  markers: MapMarker[];
  line?: [number, number][];
  height?: string;
  zoom?: number;
  fit?: boolean;
  activeId?: string | null;
  onSelect?: (m: MapMarker) => void;
  actionLabel?: (m: MapMarker) => string | null;
  onAction?: (m: MapMarker) => void;
  scrollWheelZoom?: boolean;
}) {
  const icons = useMemo(() => new Map(markers.map((m) => [m.id, icon(m, m.id === activeId)])), [markers, activeId]);

  return (
    <MapContainer center={KG_CENTER} zoom={zoom} zoomControl={false} scrollWheelZoom={scrollWheelZoom} style={{ height, width: "100%" }}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxZoom={18} />
      <ZoomControl position="bottomright" />
      <FitBounds markers={markers} line={line} fit={fit} />
      {line && line.length > 1 && <Polyline positions={line} pathOptions={{ color: "#12857f", weight: 4, opacity: 0.85, dashArray: undefined }} />}
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={icons.get(m.id)}
          title={m.name}
          eventHandlers={{ click: () => onSelect?.(m) }}
        >
          <Popup>
            {m.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.imageUrl.replace(/\/\d+px-([^/]+)$/, "/500px-$1")} alt="" className="h-28 w-full object-cover" loading="lazy" />
            )}
            <div className="p-3.5">
              <p className="text-[10.5px] font-semibold tracking-[0.18em] text-turquoise uppercase">
                {m.type === "destination" ? "Направление" : m.kind ? POI_KIND[m.kind] : "Место"}
              </p>
              <p className="mt-1 font-display text-[18px] leading-tight text-forest">{m.name}</p>
              {m.summary && <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-snug text-stone">{m.summary}</p>}
              <div className="mt-3 flex flex-wrap gap-3 text-[12.5px] font-semibold">
                {m.url && (
                  <Link href={m.url} className="text-forest underline underline-offset-2">
                    Подробнее
                  </Link>
                )}
                {onAction && actionLabel?.(m) && (
                  <button type="button" onClick={() => onAction(m)} className="text-turquoise underline underline-offset-2">
                    {actionLabel(m)}
                  </button>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
