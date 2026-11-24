"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, errorMessage, HttpError } from "@/lib/api-client";
import { DIFFICULTY, LANG, MONTHS, POI_KIND, TOUR_STATUS, date, som } from "@/lib/format";
import type { Category, Departure, Difficulty, PoiCard, Region, TourStatus } from "@/lib/types";
import { PhotoEditor, type PhotoInput } from "@/components/manage/PhotoEditor";
import { Badge } from "@/components/ui";

type Form = {
  title: string; summary: string; description: string; regionId: number; categoryId: number; days: number; difficulty: Difficulty;
  seasonFromMonth: number; seasonToMonth: number; maxAltitudeM: string; distanceKm: string; priceFrom: string; guideLanguages: string[];
  recommendations: string; includes: string; needsPermit: boolean; points: { poiId: string; day: number; note: string }[]; photos: PhotoInput[];
};
type Edit = Omit<Form, "maxAltitudeM" | "distanceKm" | "priceFrom" | "guideLanguages" | "points"> & {
  id: string; slug: string; status: TourStatus; moderationNote?: string | null; maxAltitudeM?: number | null; distanceKm?: number | null; priceFrom: number;
  guideLanguages: string; points: { poiId: string; day: number; note?: string | null }[]; departures: Departure[];
};

const EMPTY: Form = {
  title: "", summary: "", description: "", regionId: 0, categoryId: 0, days: 1, difficulty: "Easy", seasonFromMonth: 6, seasonToMonth: 9,
  maxAltitudeM: "", distanceKm: "", priceFrom: "", guideLanguages: ["ru"], recommendations: "", includes: "", needsPermit: false, points: [], photos: [],
};

/** Создание и редактирование тура оператором (FR-14): программа по точкам, фото, цены, выезды и места. */
export function TourEditor({ id }: { id?: string }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(EMPTY);
  const [meta, setMeta] = useState<{ status: TourStatus; note?: string | null; slug?: string } | null>(null);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pois, setPois] = useState<PoiCard[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dep, setDep] = useState({ startDate: "", price: "", seats: "10" });
  const [poiPick, setPoiPick] = useState({ poiId: "", day: 1, note: "" });

  useEffect(() => {
    Promise.all([api<Region[]>("/regions"), api<Category[]>("/categories"), api<PoiCard[]>("/poi")]).then(([r, c, p]) => {
      setRegions(r);
      setCategories(c);
      setPois(p);
      if (!id) setF((s) => ({ ...s, regionId: s.regionId || r[0]?.id, categoryId: s.categoryId || c[0]?.id }));
    });
    if (id)
      api<Edit>(`/operator/tours/${id}`).then((t) => {
        setF({
          ...t, maxAltitudeM: t.maxAltitudeM?.toString() ?? "", distanceKm: t.distanceKm?.toString() ?? "", priceFrom: t.priceFrom.toString(),
          guideLanguages: t.guideLanguages.split(","), points: t.points.map((p) => ({ poiId: p.poiId, day: p.day, note: p.note ?? "" })),
        });
        setMeta({ status: t.status, note: t.moderationNote, slug: t.slug });
        setDepartures(t.departures);
      }).catch((e) => setMsg({ ok: false, text: errorMessage(e) }));
  }, [id]);

  const poiName = useMemo(() => new Map(pois.map((p) => [p.id, p])), [pois]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (f.title.trim().length < 5) er.title = "Название — от 5 символов";
    if (f.summary.trim().length < 10) er.summary = "Краткое описание — от 10 символов";
    if (f.description.trim().length < 20) er.description = "Описание — от 20 символов";
    if (!(Number(f.priceFrom) >= 0) || f.priceFrom === "") er.priceFrom = "Укажите цену";
    if (f.guideLanguages.length === 0) er.guideLanguages = "Выберите язык гида";
    if (f.points.some((p) => p.day > f.days)) er.points = "День точки больше длительности тура";
    setErrors(er);
    if (Object.keys(er).length) return setMsg({ ok: false, text: "Проверьте поля формы" });
    setBusy(true);
    setMsg(null);
    const body = {
      ...f, title: f.title.trim(), maxAltitudeM: f.maxAltitudeM ? Number(f.maxAltitudeM) : null, distanceKm: f.distanceKm ? Number(f.distanceKm) : null,
      priceFrom: Number(f.priceFrom), guideLanguages: f.guideLanguages.join(","), points: f.points.map((p) => ({ ...p, note: p.note || null })),
    };
    try {
      const r = await api<Edit>(id ? `/operator/tours/${id}` : "/operator/tours", { method: id ? "PUT" : "POST", body });
      if (!id) router.replace(`/operator/tours/${r.id}`);
      else {
        setMeta({ status: r.status, note: r.moderationNote, slug: r.slug });
        setMsg({ ok: true, text: r.status === "Pending" ? "Сохранено. Изменения отправлены на модерацию." : "Сохранено" });
      }
    } catch (e) {
      if (e instanceof HttpError && e.details) setErrors(Object.fromEntries(Object.entries(e.details).map(([k, v]) => [k, v[0]])));
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const action = async (path: "submit" | "hide") => {
    try {
      const r = await api<Edit>(`/operator/tours/${id}/${path}`, { method: "POST" });
      setMeta({ status: r.status, note: r.moderationNote, slug: r.slug });
      setMsg({ ok: true, text: path === "submit" ? "Тур отправлен на модерацию" : "Тур снят с публикации" });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  };

  const addDeparture = async () => {
    if (!dep.startDate || !(Number(dep.price) > 0) || !(Number(dep.seats) > 0)) return setMsg({ ok: false, text: "Заполните дату, цену и количество мест выезда" });
    try {
      const d = await api<Departure>(`/operator/tours/${id}/departures`, { body: { startDate: dep.startDate, price: Number(dep.price), seatsTotal: Number(dep.seats) } });
      setDepartures((x) => [...x, d].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setDep({ startDate: "", price: "", seats: dep.seats });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  };
  const removeDeparture = async (depId: string) => {
    try {
      await api(`/operator/departures/${depId}`, { method: "DELETE" });
      setDepartures((x) => x.filter((d) => d.id !== depId));
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  };

  const err = (k: string) => errors[k] && <p className="mt-1 text-[13px] text-clay">{errors[k]}</p>;
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

  return (
    <form onSubmit={save} noValidate className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <Link href="/operator/tours" className="text-[13px] text-stone hover:text-forest">← Мои туры</Link>
        <fieldset className="card space-y-4 p-6">
          <legend className="sr-only">Основное</legend>
          <div><label htmlFor="t-title" className="label">Название</label><input id="t-title" className="field" value={f.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />{err("title")}</div>
          <div><label htmlFor="t-sum" className="label">Краткое описание</label><textarea id="t-sum" rows={2} className="field" value={f.summary} onChange={(e) => set("summary", e.target.value)} maxLength={1000} />{err("summary")}</div>
          <div><label htmlFor="t-desc" className="label">Подробное описание</label><textarea id="t-desc" rows={7} className="field" value={f.description} onChange={(e) => set("description", e.target.value)} />{err("description")}<p className="mt-1 text-[12px] text-stone">Абзацы разделяйте пустой строкой.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="t-reg" className="label">Регион</label><select id="t-reg" className="field" value={f.regionId} onChange={(e) => set("regionId", Number(e.target.value))}>{regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div><label htmlFor="t-cat" className="label">Категория</label><select id="t-cat" className="field" value={f.categoryId} onChange={(e) => set("categoryId", Number(e.target.value))}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label htmlFor="t-days" className="label">Дней</label><input id="t-days" type="number" min={1} max={60} className="field" value={f.days} onChange={(e) => set("days", Math.max(1, Math.min(60, Number(e.target.value) || 1)))} /></div>
            <div><label htmlFor="t-diff" className="label">Сложность</label><select id="t-diff" className="field" value={f.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>{Object.entries(DIFFICULTY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div><label htmlFor="t-sf" className="label">Сезон с</label><select id="t-sf" className="field" value={f.seasonFromMonth} onChange={(e) => set("seasonFromMonth", Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
            <div><label htmlFor="t-st" className="label">Сезон по</label><select id="t-st" className="field" value={f.seasonToMonth} onChange={(e) => set("seasonToMonth", Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
            <div><label htmlFor="t-alt" className="label">Макс. высота, м</label><input id="t-alt" type="number" min={0} max={9000} className="field" value={f.maxAltitudeM} onChange={(e) => set("maxAltitudeM", e.target.value)} /></div>
            <div><label htmlFor="t-dist" className="label">Протяжённость, км</label><input id="t-dist" type="number" min={0} className="field" value={f.distanceKm} onChange={(e) => set("distanceKm", e.target.value)} /></div>
            <div><label htmlFor="t-price" className="label">Цена от, сом/чел.</label><input id="t-price" type="number" min={0} className="field" value={f.priceFrom} onChange={(e) => set("priceFrom", e.target.value)} />{err("priceFrom")}</div>
            <fieldset>
              <legend className="label">Язык гида</legend>
              <div className="flex gap-3 pt-2">
                {Object.entries(LANG).map(([k, v]) => (
                  <label key={k} className="flex items-center gap-1.5 text-[14px]">
                    <input type="checkbox" className="accent-forest" checked={f.guideLanguages.includes(k)} onChange={(e) => set("guideLanguages", e.target.checked ? [...f.guideLanguages, k] : f.guideLanguages.filter((x) => x !== k))} /> {v}
                  </label>
                ))}
              </div>
              {err("guideLanguages")}
            </fieldset>
          </div>
          <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="accent-forest" checked={f.needsPermit} onChange={(e) => set("needsPermit", e.target.checked)} /> Требуется пропуск в пограничную зону</label>
        </fieldset>

        <fieldset className="card space-y-4 p-6">
          <legend className="px-1 font-display text-xl text-forest">Программа по точкам</legend>
          {f.points.length === 0 && <p className="text-[14px] text-stone">Добавьте точки маршрута из базы объектов.</p>}
          <ol className="space-y-2">
            {f.points.map((p, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-sm border border-graphite/10 p-2.5">
                <select aria-label="День" className="field !w-24 !py-1.5" value={p.day} onChange={(e) => set("points", f.points.map((x, j) => (j === i ? { ...x, day: Number(e.target.value) } : x)))}>
                  {Array.from({ length: f.days }, (_, d) => <option key={d} value={d + 1}>День {d + 1}</option>)}
                </select>
                <span className="min-w-0 flex-1 font-semibold">{poiName.get(p.poiId)?.name ?? "…"}</span>
                <input aria-label="Заметка" placeholder="Заметка" className="field !w-48 !py-1.5 text-[13px]" value={p.note} onChange={(e) => set("points", f.points.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
                <button type="button" aria-label="Удалить точку" onClick={() => set("points", f.points.filter((_, j) => j !== i))} className="text-stone hover:text-clay"><Trash2 size={16} /></button>
              </li>
            ))}
          </ol>
          {err("points")}
          <div className="flex flex-wrap gap-2">
            <select aria-label="Точка" className="field flex-1 !py-2" value={poiPick.poiId} onChange={(e) => setPoiPick({ ...poiPick, poiId: e.target.value })}>
              <option value="">Выберите точку…</option>
              {pois.map((p) => <option key={p.id} value={p.id}>{p.name} — {POI_KIND[p.kind]}, {p.region}</option>)}
            </select>
            <select aria-label="День для точки" className="field !w-28 !py-2" value={poiPick.day} onChange={(e) => setPoiPick({ ...poiPick, day: Number(e.target.value) })}>
              {Array.from({ length: f.days }, (_, d) => <option key={d} value={d + 1}>День {d + 1}</option>)}
            </select>
            <button type="button" className="btn-outline !py-2" onClick={() => poiPick.poiId && (set("points", [...f.points, { poiId: poiPick.poiId, day: poiPick.day, note: "" }]), setPoiPick({ ...poiPick, poiId: "" }))}><Plus size={16} /> Добавить</button>
          </div>
        </fieldset>

        <fieldset className="card space-y-4 p-6">
          <legend className="px-1 font-display text-xl text-forest">Фотографии</legend>
          <PhotoEditor value={f.photos} onChange={(v) => set("photos", v)} />
        </fieldset>

        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="px-1 font-display text-xl text-forest">Для туриста</legend>
          <div><label htmlFor="t-inc" className="label">Входит в стоимость (по строке)</label><textarea id="t-inc" rows={5} className="field" value={f.includes} onChange={(e) => set("includes", e.target.value)} /></div>
          <div><label htmlFor="t-rec" className="label">Рекомендации (по строке)</label><textarea id="t-rec" rows={5} className="field" value={f.recommendations} onChange={(e) => set("recommendations", e.target.value)} /></div>
        </fieldset>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
        <div className="card space-y-3 p-5">
          {meta && <div className="flex items-center gap-2"><span className="text-[13px] text-stone">Статус:</span><Badge tone={meta.status === "Published" ? "ok" : meta.status === "Rejected" ? "bad" : "info"}>{TOUR_STATUS[meta.status]}</Badge></div>}
          {meta?.status === "Rejected" && meta.note && <p className="text-[13px] text-clay">Причина: {meta.note}</p>}
          <button disabled={busy} className="btn-primary w-full">{busy ? "Сохраняем…" : id ? "Сохранить изменения" : "Создать тур"}</button>
          {id && meta && ["Draft", "Rejected", "Hidden"].includes(meta.status) && <button type="button" onClick={() => action("submit")} className="btn-accent w-full">Отправить на модерацию</button>}
          {id && meta?.status === "Published" && <button type="button" onClick={() => action("hide")} className="btn-outline w-full">Снять с публикации</button>}
          {meta?.status === "Published" && meta.slug && <Link href={`/tours/${meta.slug}`} className="block text-center text-[13px] text-turquoise underline">Открыть страницу тура</Link>}
          {msg && <p className={`text-[13.5px] ${msg.ok ? "text-turquoise" : "text-clay"}`} role="status">{msg.text}</p>}
        </div>
        {id && (
          <div className="card space-y-3 p-5">
            <h3 className="font-display text-xl text-forest">Выезды</h3>
            {departures.length === 0 && <p className="text-[13px] text-stone">Выездов нет — турист не сможет отправить заявку.</p>}
            <ul className="space-y-1.5 text-[13.5px]">
              {departures.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 border-b border-graphite/8 pb-1.5">
                  <span>{date(d.startDate, { day: "numeric", month: "short", year: "numeric" })} · {som(d.price)} · {d.seatsAvailable}/{d.seatsTotal}</span>
                  <button type="button" onClick={() => removeDeparture(d.id)} aria-label="Удалить выезд" className="text-stone hover:text-clay"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-3 gap-2">
              <input type="date" aria-label="Дата выезда" min={tomorrow} className="field col-span-3 !py-1.5" value={dep.startDate} onChange={(e) => setDep({ ...dep, startDate: e.target.value })} />
              <input type="number" aria-label="Цена за человека" placeholder="Цена" className="field col-span-2 !py-1.5" value={dep.price} onChange={(e) => setDep({ ...dep, price: e.target.value })} />
              <input type="number" aria-label="Мест" placeholder="Мест" min={1} className="field !py-1.5" value={dep.seats} onChange={(e) => setDep({ ...dep, seats: e.target.value })} />
            </div>
            <button type="button" onClick={addDeparture} className="btn-outline w-full !py-2"><Plus size={15} /> Добавить выезд</button>
          </div>
        )}
      </aside>
    </form>
  );
}
