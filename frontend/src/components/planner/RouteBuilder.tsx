"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, Copy, Download, FileText, GripVertical, Map as MapIcon, Moon, Plus, Search, Send, Trash2, X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api, download, errorMessage } from "@/lib/api-client";
import { Map } from "@/components/map/Map";
import { POI_KIND, VEHICLE, som } from "@/lib/format";
import type { Estimate, PoiCard, Provider, UserRoute, VehicleType } from "@/lib/types";
import { BookingDialog } from "./BookingDialog";

type Pt = { key: string; poiId: string; day: number; nights: number };

/**
 * Конструктор маршрута (рис. 2.10): карта + панель маршрута. Точки добавляются щелчком по карте или поиском,
 * распределяются по дням и меняются местами перетаскиванием или стрелками. После каждого изменения маршрут
 * сохраняется (PUT /routes/{id}/points), а смета пересчитывается на сервере (POST /routes/{id}/estimate).
 */
export function RouteBuilder({ id }: { id: string }) {
  const router = useRouter();
  const [route, setRoute] = useState<UserRoute | null>(null);
  const [pois, setPois] = useState<PoiCard[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [points, setPoints] = useState<Pt[]>([]);
  const [dayCount, setDayCount] = useState(1);
  const [targetDay, setTargetDay] = useState(1);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estError, setEstError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"map" | "route">("route");
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [dirty, setDirty] = useState(0);
  const firstLoad = useRef(true);

  const poiById = useMemo(() => new globalThis.Map(pois.map((p) => [p.id, p])), [pois]);

  // ---------- Загрузка ----------
  useEffect(() => {
    Promise.all([api<UserRoute>(`/routes/${id}`), api<PoiCard[]>("/poi"), api<Provider[]>("/providers")])
      .then(([r, p, pr]) => {
        setRoute(r);
        setPois(p);
        setProviders(pr);
        setPoints(r.points.map((x) => ({ key: x.id, poiId: x.poiId, day: x.day, nights: x.nights })));
        setDayCount(Math.max(1, ...r.points.map((x) => x.day)));
      })
      .catch((e) => setLoadError(errorMessage(e)));
  }, [id]);

  // ---------- Пересчёт сметы ----------
  const recalc = useCallback(async () => {
    if (points.length === 0) {
      setEstimate(null);
      setEstError(null);
      return;
    }
    try {
      setEstimate(await api<Estimate>(`/routes/${id}/estimate`, { method: "POST" }));
      setEstError(null);
    } catch (e) {
      setEstError(errorMessage(e));
    }
  }, [id, points.length]);

  // Автосохранение точек с задержкой, затем смета.
  useEffect(() => {
    if (!route) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      recalc();
      return;
    }
    setSaving("saving");
    const t = setTimeout(async () => {
      try {
        await api(`/routes/${id}/points`, { method: "PUT", body: { points: points.map((p) => ({ poiId: p.poiId, day: p.day, nights: p.nights })) } });
        setSaving("saved");
        recalc();
      } catch (e) {
        setSaving("error");
        setEstError(errorMessage(e));
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, dirty]);

  const saveSettings = async (patch: Partial<UserRoute>) => {
    if (!route) return;
    const next = { ...route, ...patch };
    setRoute(next);
    try {
      const r = await api<UserRoute>(`/routes/${id}`, {
        method: "PUT",
        body: { title: next.title || "Мой маршрут", participants: next.participants, startDate: next.startDate || null, vehicleType: next.vehicleType, withGuide: next.withGuide, operatorId: next.operatorId || null },
      });
      setRoute((cur) => (cur ? { ...cur, operatorName: r.operatorName, updatedAt: r.updatedAt } : cur));
      recalc();
    } catch (e) {
      setEstError(errorMessage(e));
    }
  };

  // ---------- Операции с точками ----------
  const ordered = useMemo(() => [...points].sort((a, b) => a.day - b.day), [points]);
  const add = (poiId: string, day = targetDay) => {
    setPoints((ps) => {
      const before = ps.filter((p) => p.day <= day);
      const after = ps.filter((p) => p.day > day);
      return [...before, { key: crypto.randomUUID(), poiId, day, nights: 0 }, ...after];
    });
    setTab("route");
  };
  const remove = (key: string) => setPoints((ps) => ps.filter((p) => p.key !== key));
  const patch = (key: string, ch: Partial<Pt>) => setPoints((ps) => ps.map((p) => (p.key === key ? { ...p, ...ch } : p)));
  const move = (key: string, dir: -1 | 1) =>
    setPoints((ps) => {
      const list = [...ps].sort((a, b) => a.day - b.day);
      const i = list.findIndex((p) => p.key === key);
      const j = i + dir;
      if (j < 0 || j >= list.length) return ps;
      if (list[j].day !== list[i].day) {
        list[i] = { ...list[i], day: list[j].day };
        return list;
      }
      [list[i], list[j]] = [list[j], list[i]];
      return list;
    });
  const dropOn = (targetKey: string | null, day: number) => {
    if (!dragKey) return;
    setPoints((ps) => {
      const dragged = ps.find((p) => p.key === dragKey);
      if (!dragged) return ps;
      const rest = [...ps].sort((a, b) => a.day - b.day).filter((p) => p.key !== dragKey);
      const moved = { ...dragged, day };
      const idx = targetKey ? rest.findIndex((p) => p.key === targetKey) : rest.findLastIndex((p) => p.day <= day) + 1;
      rest.splice(idx < 0 ? rest.length : idx, 0, moved);
      return rest;
    });
    setDragKey(null);
  };
  const removeDay = (d: number) => {
    setPoints((ps) => ps.filter((p) => p.day !== d).map((p) => (p.day > d ? { ...p, day: p.day - 1 } : p)));
    setDayCount((c) => Math.max(1, c - 1));
    setTargetDay((t) => Math.min(t, Math.max(1, dayCount - 1)));
  };

  if (loadError)
    return (
      <section className="container-x pt-[calc(var(--header-h)+60px)] pb-24">
        <h1 className="h-display text-4xl text-forest">Маршрут не найден</h1>
        <p className="mt-3 text-stone">{loadError}</p>
        <Link href="/planner" className="btn-primary mt-6">К моим маршрутам</Link>
      </section>
    );
  if (!route)
    return <div className="grid min-h-[100svh] place-items-center text-stone" role="status">Загрузка конструктора…</div>;

  const search = q.trim().toLowerCase();
  const found = search ? pois.filter((p) => p.name.toLowerCase().includes(search) || p.region.toLowerCase().includes(search)).slice(0, 8) : [];
  const numbered = ordered.map((p, i) => ({ ...p, n: i + 1, poi: poiById.get(p.poiId) })).filter((p) => p.poi);
  const firstIndex = new globalThis.Map<string, number>();
  numbered.forEach((p) => !firstIndex.has(p.poiId) && firstIndex.set(p.poiId, p.n));

  const markers = pois.map((p) => ({
    id: p.id, name: p.name, lat: p.latitude, lng: p.longitude, type: "poi" as const, kind: p.kind, summary: p.summary,
    imageUrl: p.cover?.url, url: `/attractions/${p.slug}`, label: firstIndex.has(p.id) ? String(firstIndex.get(p.id)) : undefined,
  }));
  const line: [number, number][] = estimate?.geometry?.length ? estimate.geometry : numbered.map((p) => [p.poi!.latitude, p.poi!.longitude]);
  const provider = providers.find((p) => p.id === route.operatorId);
  const vehicles: VehicleType[] = ["Sedan", "Minivan", "Bus"];

  return (
    <div className="flex min-h-[100svh] flex-col pt-[var(--header-h)] lg:h-[100svh]">
      {/* Вкладки для смартфонов (п. 2.8: на узком экране карта и маршрут переключаются) */}
      <div className="flex gap-1 border-b border-graphite/10 bg-white p-2 md:hidden" role="tablist">
        {(["route", "map"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex flex-1 items-center justify-center gap-2 rounded-sm py-2 text-sm font-semibold ${tab === t ? "bg-forest text-white" : "text-stone"}`}>
            {t === "map" ? <><MapIcon size={16} /> Карта</> : <>Маршрут ({points.length})</>}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ---------- Карта ---------- */}
        <div className={`${tab === "map" ? "block" : "hidden"} h-[calc(100svh-var(--header-h)-56px)] md:block md:h-[48vh] lg:h-auto lg:flex-1`}>
          <Map
            markers={markers}
            line={line.length > 1 ? line : undefined}
            fit={points.length > 0}
            scrollWheelZoom
            actionLabel={() => `Добавить в день ${targetDay}`}
            onAction={(m) => add(m.id)}
          />
        </div>

        {/* ---------- Панель маршрута ---------- */}
        <aside className={`${tab === "route" ? "flex" : "hidden"} w-full flex-col border-l border-graphite/10 bg-sand-light md:flex lg:w-[460px] lg:overflow-y-auto`}>
          <div className="space-y-4 border-b border-graphite/10 p-5">
            <div className="flex items-center justify-between gap-2 text-[13px]">
              <button onClick={() => router.push("/planner")} className="inline-flex items-center gap-1 text-stone hover:text-forest"><ChevronLeft size={15} /> Мои маршруты</button>
              <span className={saving === "error" ? "text-clay" : "text-stone"} aria-live="polite">
                {saving === "saving" ? "Сохраняем…" : saving === "saved" ? "Сохранено" : saving === "error" ? "Ошибка сохранения" : ""}
              </span>
            </div>
            <input
              aria-label="Название маршрута"
              defaultValue={route.title}
              maxLength={160}
              onBlur={(e) => e.target.value.trim() !== route.title && saveSettings({ title: e.target.value.trim() || "Мой маршрут" })}
              className="w-full border-b border-transparent bg-transparent font-display text-3xl text-forest hover:border-graphite/20 focus:border-turquoise focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[12.5px] font-semibold">
                Участников
                <input type="number" min={1} max={50} value={route.participants}
                  onChange={(e) => { const v = Math.min(50, Math.max(1, Number(e.target.value) || 1)); saveSettings({ participants: v }); }}
                  className="field mt-1 !py-2" />
              </label>
              <label className="text-[12.5px] font-semibold">
                Дата начала
                <input type="date" value={route.startDate ?? ""} min={new Date(Date.now() + 864e5).toISOString().slice(0, 10)}
                  onChange={(e) => saveSettings({ startDate: e.target.value || null })} className="field mt-1 !py-2" />
              </label>
              <label className="text-[12.5px] font-semibold">
                Транспорт
                <select value={route.vehicleType} onChange={(e) => saveSettings({ vehicleType: e.target.value as VehicleType })} className="field mt-1 !py-2 text-[14px]">
                  {vehicles.map((v) => <option key={v} value={v} disabled={!!provider && !provider.vehicles.includes(v)}>{VEHICLE[v]}</option>)}
                </select>
              </label>
              <label className="text-[12.5px] font-semibold">
                Тарифы оператора
                <select value={route.operatorId ?? ""} onChange={(e) => saveSettings({ operatorId: e.target.value || null })} className="field mt-1 !py-2 text-[14px]">
                  <option value="">Подобрать автоматически</option>
                  {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={route.withGuide} onChange={(e) => saveSettings({ withGuide: e.target.checked })} className="accent-forest" /> Нужен гид
            </label>
          </div>

          {/* Поиск точки */}
          <div className="relative border-b border-graphite/10 p-5">
            <label htmlFor="poi-search" className="label">Добавить точку в день {targetDay}</label>
            <div className="relative">
              <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-stone" aria-hidden />
              <input id="poi-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Озеро, город, перевал…" className="field !pl-9" autoComplete="off" />
            </div>
            {found.length > 0 && (
              <ul className="absolute inset-x-5 z-20 mt-1 max-h-72 overflow-y-auto rounded-sm border border-graphite/10 bg-white shadow-xl">
                {found.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { add(p.id); setQ(""); }} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-sand-light">
                      <span>
                        <span className="block text-[14.5px] font-semibold">{p.name}</span>
                        <span className="text-[12px] text-stone">{POI_KIND[p.kind]} · {p.region}</span>
                      </span>
                      <Plus size={16} className="text-turquoise" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[12px] text-stone">Или нажмите на маркер на карте и выберите «Добавить».</p>
          </div>

          {/* Дни */}
          <div className="flex-1 space-y-4 p-5">
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => {
              const dayPts = numbered.filter((p) => p.day === d);
              const hours = estimate?.drivingHoursByDay[d - 1];
              return (
                <section
                  key={d}
                  aria-label={`День ${d}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(null, d)}
                  className={`rounded-sm border bg-white ${targetDay === d ? "border-turquoise" : "border-graphite/10"}`}
                >
                  <header className="flex items-center justify-between gap-2 border-b border-graphite/8 px-4 py-2.5">
                    <button type="button" onClick={() => setTargetDay(d)} className="text-left">
                      <span className="font-display text-lg text-forest">День {d}</span>
                      {hours !== undefined && hours > 0 && <span className={`ml-2 text-[12px] ${hours > 8 ? "font-semibold text-clay" : "text-stone"}`}>в пути ~{hours} ч</span>}
                    </button>
                    <div className="flex items-center gap-1">
                      {targetDay !== d && <button type="button" onClick={() => setTargetDay(d)} className="text-[12px] text-turquoise hover:underline">добавлять сюда</button>}
                      {dayCount > 1 && <button type="button" onClick={() => removeDay(d)} aria-label={`Удалить день ${d}`} className="grid h-8 w-8 place-items-center text-stone hover:text-clay"><X size={15} /></button>}
                    </div>
                  </header>
                  {dayPts.length === 0 ? (
                    <p className="px-4 py-4 text-[13px] text-stone">Перетащите сюда точку или добавьте через поиск.</p>
                  ) : (
                    <ol>
                      {dayPts.map((p) => (
                        <li
                          key={p.key}
                          draggable
                          onDragStart={() => setDragKey(p.key)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => { e.stopPropagation(); dropOn(p.key, d); }}
                          className={`flex items-center gap-2 border-b border-graphite/6 px-2 py-2.5 last:border-0 ${dragKey === p.key ? "opacity-40" : ""}`}
                        >
                          <GripVertical size={16} className="shrink-0 cursor-grab text-stone/60" aria-hidden />
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-turquoise text-[11px] font-bold text-white">{p.n}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14.5px] font-semibold">{p.poi!.name}</p>
                            <p className="text-[11.5px] text-stone">{POI_KIND[p.poi!.kind]} · {p.poi!.region}</p>
                          </div>
                          <label className="flex items-center gap-1 text-[12px] text-stone" title="Ночёвок в этой точке">
                            <Moon size={13} aria-hidden />
                            <span className="sr-only">Ночёвок</span>
                            <input type="number" min={0} max={30} value={p.nights} onChange={(e) => patch(p.key, { nights: Math.min(30, Math.max(0, Number(e.target.value) || 0)) })} className="w-11 rounded-xs border border-graphite/15 px-1 py-0.5 text-center" />
                          </label>
                          <div className="flex flex-col">
                            <button type="button" onClick={() => move(p.key, -1)} aria-label="Выше" className="text-stone hover:text-forest"><ArrowUp size={14} /></button>
                            <button type="button" onClick={() => move(p.key, 1)} aria-label="Ниже" className="text-stone hover:text-forest"><ArrowDown size={14} /></button>
                          </div>
                          <button type="button" onClick={() => remove(p.key)} aria-label={`Удалить ${p.poi!.name}`} className="grid h-8 w-8 place-items-center text-stone hover:text-clay"><Trash2 size={15} /></button>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              );
            })}
            <button type="button" onClick={() => { setDayCount((c) => Math.min(60, c + 1)); setTargetDay(dayCount + 1); }} className="btn-outline w-full !py-2.5">
              <Plus size={16} /> Добавить день
            </button>
          </div>

          {/* ---------- Смета ---------- */}
          <div className="sticky bottom-0 border-t border-graphite/10 bg-white p-5 shadow-[0_-10px_30px_-20px_rgba(0,0,0,0.3)]">
            {estError && <p className="mb-3 text-[13px] text-clay" role="alert">{estError}</p>}
            {estimate ? (
              <>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-end justify-between gap-3">
                    <span>
                      <span className="block text-[12px] text-stone">Ориентировочно · {estimate.participants} чел. · ~{estimate.distanceKm} км</span>
                      <span className="font-display text-3xl text-forest">{som(estimate.total)}</span>
                      <span className="ml-2 text-[13px] text-stone">{som(estimate.perPerson)} / чел.</span>
                    </span>
                    <span className="text-[12px] font-semibold text-turquoise group-open:hidden">Подробнее</span>
                  </summary>
                  <dl className="mt-4 space-y-1.5 text-[13.5px]">
                    {[
                      ["Транспорт", estimate.items.transport, `${estimate.vehicles} × ${estimate.weightedDistanceKm} км (с учётом дорог)`],
                      ["Проживание", estimate.items.lodging, null],
                      ["Питание", estimate.items.meals, `${estimate.days} дн.`],
                      ["Гид", estimate.items.guide, null],
                      ["Сборы и билеты", estimate.items.fees, null],
                    ].map(([k, v, hint]) => (
                      <div key={k as string} className="flex justify-between gap-3">
                        <dt className="text-stone">{k as string}{hint && <span className="ml-1 text-[11.5px] opacity-75">· {hint as string}</span>}</dt>
                        <dd>{som(v as number)}</dd>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-graphite/8 pt-1.5 text-stone">
                      <dt>Сезон × {estimate.seasonFactor.toFixed(2)}, наценка {Math.round(estimate.operatorMargin * 100)}%</dt>
                      <dd>{estimate.operatorName}</dd>
                    </div>
                  </dl>
                </details>
                {estimate.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {estimate.warnings.map((w) => (
                      <li key={w} className="flex gap-1.5 text-[12.5px] text-[#8a5a12]"><AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden /> {w}</li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11.5px] text-stone">Тарифы демонстрационные; итоговую цену подтверждает оператор.</p>
                <div className="mt-4 grid grid-cols-[1fr_auto_auto_auto] gap-2">
                  <button type="button" onClick={() => setBooking(true)} className="btn-accent !py-3"><Send size={16} /> Отправить заявку</button>
                  <button type="button" title="Скачать PDF" aria-label="Скачать программу в PDF" onClick={() => download(`/routes/${id}/export?format=pdf`, "turmax-route.pdf").catch((e) => setEstError(errorMessage(e)))} className="btn-outline !px-3"><FileText size={16} /></button>
                  <button type="button" title="Скачать GPX" aria-label="Скачать трек GPX" onClick={() => download(`/routes/${id}/export?format=gpx`, "turmax-route.gpx").catch((e) => setEstError(errorMessage(e)))} className="btn-outline !px-3"><Download size={16} /></button>
                  <button type="button" title="Сделать копию" aria-label="Сделать копию маршрута" onClick={async () => { const r = await api<UserRoute>(`/routes/${id}/copy`, { method: "POST" }); router.push(`/planner/${r.id}`); }} className="btn-outline !px-3"><Copy size={16} /></button>
                </div>
              </>
            ) : (
              <p className="text-[14px] text-stone">Добавьте точки маршрута — смета появится автоматически.</p>
            )}
          </div>
        </aside>
      </div>

      {booking && estimate && (
        <BookingDialog
          routeId={id}
          participants={route.participants}
          startDate={route.startDate ?? ""}
          total={estimate.total}
          onClose={() => setBooking(false)}
          onSaved={() => setDirty((n) => n + 1)}
        />
      )}
    </div>
  );
}
