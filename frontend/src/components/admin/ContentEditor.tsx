"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, errorMessage, HttpError } from "@/lib/api-client";
import { POI_KIND, ROAD } from "@/lib/format";
import type { Category, DestinationCard, Region } from "@/lib/types";
import { PhotoEditor, type PhotoInput } from "@/components/manage/PhotoEditor";

type Kind = "destinations" | "poi" | "articles";
type Field =
  | { k: string; label: string; type: "text" | "textarea" | "number" | "checkbox" | "region" | "destination" | "categories"; rows?: number; hint?: string; full?: boolean }
  | { k: string; label: string; type: "select"; options: Record<string, string>; full?: boolean };

const FIELDS: Record<Kind, Field[]> = {
  destinations: [
    { k: "name", label: "Название", type: "text" },
    { k: "slug", label: "Адрес страницы (латиница)", type: "text", hint: "Пусто — сформируется из названия" },
    { k: "tagline", label: "Подзаголовок", type: "text", full: true },
    { k: "summary", label: "Краткое описание", type: "textarea", rows: 3, full: true },
    { k: "description", label: "Подробное описание", type: "textarea", rows: 9, full: true, hint: "Абзацы — через пустую строку, подзаголовки — строки с «## »" },
    { k: "regionId", label: "Регион", type: "region" },
    { k: "bestTime", label: "Лучшее время для посещения", type: "text" },
    { k: "latitude", label: "Широта", type: "number" },
    { k: "longitude", label: "Долгота", type: "number" },
    { k: "highlights", label: "Особенности (по одной на строку)", type: "textarea", rows: 4, full: true },
    { k: "categoryIds", label: "Категории", type: "categories", full: true },
    { k: "sortOrder", label: "Порядок сортировки", type: "number" },
    { k: "isFeatured", label: "Показывать среди популярных", type: "checkbox" },
  ],
  poi: [
    { k: "name", label: "Название", type: "text" },
    { k: "slug", label: "Адрес страницы (латиница)", type: "text", hint: "Пусто — сформируется из названия" },
    { k: "kind", label: "Тип", type: "select", options: POI_KIND },
    { k: "regionId", label: "Регион", type: "region" },
    { k: "destinationId", label: "Направление", type: "destination" },
    { k: "roadType", label: "Дорога к точке", type: "select", options: ROAD },
    { k: "summary", label: "Краткое описание", type: "textarea", rows: 2, full: true },
    { k: "description", label: "Описание", type: "textarea", rows: 6, full: true },
    { k: "latitude", label: "Широта", type: "number" },
    { k: "longitude", label: "Долгота", type: "number" },
    { k: "altitudeM", label: "Высота, м", type: "number" },
    { k: "season", label: "Сезон", type: "text" },
    { k: "entryFee", label: "Входной билет / сбор, сом с чел.", type: "number" },
    { k: "lodgingPrice", label: "Ночлег, сом с чел. за ночь", type: "number" },
    { k: "needsPermit", label: "Пограничная зона (нужен пропуск)", type: "checkbox" },
    { k: "isPublished", label: "Опубликовано", type: "checkbox" },
  ],
  articles: [
    { k: "title", label: "Заголовок", type: "text", full: true },
    { k: "slug", label: "Адрес страницы (латиница)", type: "text", hint: "Пусто — сформируется из заголовка" },
    { k: "topic", label: "Рубрика", type: "text" },
    { k: "lead", label: "Лид (вступление)", type: "textarea", rows: 3, full: true },
    { k: "body", label: "Текст статьи", type: "textarea", rows: 16, full: true, hint: "Абзацы — через пустую строку, подзаголовки — строки с «## »" },
    { k: "authorName", label: "Автор", type: "text" },
    { k: "readingMinutes", label: "Минут на чтение", type: "number" },
    { k: "destinationId", label: "Связанное направление", type: "destination" },
    { k: "isPublished", label: "Опубликовано", type: "checkbox" },
  ],
};

const DEFAULTS: Record<Kind, Record<string, unknown>> = {
  destinations: { name: "", slug: "", tagline: "", summary: "", description: "", regionId: 0, latitude: "", longitude: "", bestTime: "", highlights: "", isFeatured: false, sortOrder: 100, categoryIds: [] },
  poi: { name: "", slug: "", kind: "Nature", summary: "", description: "", regionId: 0, destinationId: "", latitude: "", longitude: "", altitudeM: "", roadType: "Asphalt", entryFee: "", lodgingPrice: "", needsPermit: false, season: "", isPublished: true },
  articles: { title: "", slug: "", lead: "", body: "", topic: "Идеи для поездки", authorName: "Редакция TurMax", readingMinutes: 5, isPublished: true, destinationId: "" },
};
const NUMERIC = new Set(["latitude", "longitude", "altitudeM", "entryFee", "lodgingPrice", "sortOrder", "readingMinutes", "regionId"]);
const TITLES: Record<Kind, string> = { destinations: "Направление", poi: "Место", articles: "Статья" };
const PUBLIC: Record<Kind, string> = { destinations: "/destinations/", poi: "/attractions/", articles: "/journal/" };

/** Редактор контента портала (направления, точки интереса, статьи) для администратора. */
export function ContentEditor({ kind, id }: { kind: Kind; id: string | null }) {
  const router = useRouter();
  const [v, setV] = useState<Record<string, unknown>>(DEFAULTS[kind]);
  const [photos, setPhotos] = useState<PhotoInput[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [dests, setDests] = useState<DestinationCard[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Region[]>("/regions").then((r) => {
      setRegions(r);
      setV((s) => (s.regionId ? s : { ...s, regionId: r[0]?.id }));
    });
    api<Category[]>("/categories").then(setCats);
    api<DestinationCard[]>("/destinations").then(setDests);
    if (id)
      api<Record<string, unknown> & { photos: PhotoInput[] }>(`/admin/${kind}/${id}`)
        .then(({ photos: p, ...rest }) => {
          setV(Object.fromEntries(Object.entries(rest).map(([k, x]) => [k, x === null ? "" : x])));
          setPhotos(p);
        })
        .catch((e) => setMsg({ ok: false, text: errorMessage(e) }));
  }, [kind, id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    const nameKey = kind === "articles" ? "title" : "name";
    if (String(v[nameKey] ?? "").trim().length < 2) er[nameKey] = "Обязательное поле";
    if (v.slug && !/^[a-z0-9-]+$/.test(String(v.slug))) er.slug = "Только латиница, цифры и дефис";
    if (kind !== "articles") {
      const lat = Number(v.latitude), lng = Number(v.longitude);
      if (!(lat >= 39 && lat <= 44)) er.latitude = "Широта Кыргызстана: 39–44";
      if (!(lng >= 69 && lng <= 81)) er.longitude = "Долгота Кыргызстана: 69–81";
    }
    setErrors(er);
    if (Object.keys(er).length) return setMsg({ ok: false, text: "Проверьте поля формы" });

    const body: Record<string, unknown> = { photos };
    for (const [k, x] of Object.entries(v)) {
      if (k === "id" || k === "publishedAt") continue;
      body[k] = NUMERIC.has(k) ? (x === "" ? null : Number(x)) : x === "" && (k === "destinationId" || k === "slug" || k === "season" || k === "bestTime") ? null : x;
    }
    setBusy(true);
    try {
      if (id) {
        await api(`/admin/${kind}/${id}`, { method: "PUT", body });
        setMsg({ ok: true, text: "Сохранено" });
      } else {
        const r = await api<{ id: string }>(`/admin/${kind}`, { body });
        router.replace(`/admin/content/${kind}/${r.id}`);
      }
    } catch (e) {
      if (e instanceof HttpError && e.details) setErrors(Object.fromEntries(Object.entries(e.details).map(([k, x]) => [k, x[0]])));
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const input = (f: Field) => {
    const val = v[f.k];
    const common = { id: `c-${f.k}`, "aria-invalid": !!errors[f.k] };
    switch (f.type) {
      case "textarea": return <textarea {...common} rows={f.rows} className="field" value={String(val ?? "")} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />;
      case "number": return <input {...common} type="number" step="any" className="field" value={String(val ?? "")} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />;
      case "checkbox": return <input {...common} type="checkbox" className="accent-forest" checked={!!val} onChange={(e) => setV({ ...v, [f.k]: e.target.checked })} />;
      case "region": return <select {...common} className="field" value={String(val)} onChange={(e) => setV({ ...v, [f.k]: Number(e.target.value) })}>{regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>;
      case "destination": return <select {...common} className="field" value={String(val ?? "")} onChange={(e) => setV({ ...v, [f.k]: e.target.value })}><option value="">— нет —</option>{dests.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>;
      case "select": return <select {...common} className="field" value={String(val)} onChange={(e) => setV({ ...v, [f.k]: e.target.value })}>{Object.entries(f.options).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
      case "categories": {
        const sel = (val as number[]) ?? [];
        return (
          <div className="flex flex-wrap gap-3">
            {cats.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-[14px]">
                <input type="checkbox" className="accent-forest" checked={sel.includes(c.id)} onChange={(e) => setV({ ...v, [f.k]: e.target.checked ? [...sel, c.id] : sel.filter((x) => x !== c.id) })} /> {c.name}
              </label>
            ))}
          </div>
        );
      }
      default: return <input {...common} className="field" value={String(val ?? "")} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />;
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/admin/content?type=${kind}`} className="text-[13px] text-stone hover:text-forest">← К списку</Link>
          <h2 className="mt-1 font-display text-3xl text-forest">{id ? `${TITLES[kind]}: ${String(v.name ?? v.title ?? "")}` : `Новое: ${TITLES[kind].toLowerCase()}`}</h2>
        </div>
        {id && typeof v.slug === "string" && v.slug && <Link href={`${PUBLIC[kind]}${v.slug}`} className="text-[14px] text-turquoise underline">Открыть на сайте</Link>}
      </div>
      <div className="card grid gap-5 p-6 md:grid-cols-2">
        {FIELDS[kind].map((f) => (
          <div key={f.k} className={`${"full" in f && f.full ? "md:col-span-2" : ""} ${f.type === "checkbox" ? "flex items-center gap-2" : ""}`}>
            {f.type === "checkbox" ? (
              <>{input(f)}<label htmlFor={`c-${f.k}`} className="text-[14px]">{f.label}</label></>
            ) : (
              <>
                <label htmlFor={`c-${f.k}`} className="label">{f.label}</label>
                {input(f)}
                {"hint" in f && f.hint && <p className="mt-1 text-[12px] text-stone">{f.hint}</p>}
              </>
            )}
            {errors[f.k] && <p className="mt-1 text-[13px] text-clay">{errors[f.k]}</p>}
          </div>
        ))}
      </div>
      <div className="card space-y-3 p-6">
        <h3 className="font-display text-xl text-forest">Фотографии</h3>
        <p className="text-[13px] text-stone">Первое фото — обложка. Для фото из открытых источников укажите автора и лицензию.</p>
        <PhotoEditor value={photos} onChange={setPhotos} />
      </div>
      <div className="flex items-center gap-4">
        <button disabled={busy} className="btn-primary">{busy ? "Сохраняем…" : "Сохранить"}</button>
        {msg && <p className={`text-[14px] ${msg.ok ? "text-turquoise" : "text-clay"}`} role="status">{msg.text}</p>}
      </div>
    </form>
  );
}
