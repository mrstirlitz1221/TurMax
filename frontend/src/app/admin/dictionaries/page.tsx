"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { Category, Region } from "@/lib/types";

/** Ведение справочников (FR-19): регионы и категории (типы туров). */
export default function DictionariesPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [r, setR] = useState({ name: "", slug: "", center: "" });
  const [c, setC] = useState({ name: "", slug: "", tagline: "", description: "", imageUrl: "" });

  const load = () => {
    api<Region[]>("/regions").then(setRegions);
    api<Category[]>("/categories").then(setCats);
  };
  useEffect(load, []);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setErr(null);
      load();
      return true;
    } catch (e) {
      setErr(errorMessage(e));
      return false;
    }
  };
  const slugOk = (s: string) => /^[a-z0-9-]+$/.test(s);

  return (
    <div className="space-y-12">
      {err && <p className="text-clay" role="alert">{err}</p>}
      <section className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="mb-4 font-display text-2xl text-forest">Регионы</h2>
          <ul className="divide-y divide-graphite/8 rounded-sm bg-white">
            {regions.map((x) => (
              <li key={x.id} className="flex items-center gap-3 px-4 py-2.5">
                <input aria-label="Название региона" defaultValue={x.name} className="field !py-1.5" onBlur={(e) => e.target.value.trim() !== x.name && run(() => api(`/admin/regions/${x.id}`, { method: "PUT", body: { name: e.target.value.trim(), slug: x.slug, center: x.center } }))} />
                <span className="w-32 shrink-0 font-mono text-[12.5px] text-stone">{x.slug}</span>
                <button aria-label={`Удалить ${x.name}`} onClick={() => confirm(`Удалить регион «${x.name}»?`) && run(() => api(`/admin/regions/${x.id}`, { method: "DELETE" }))} className="text-stone hover:text-clay"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </div>
        <form className="card h-fit space-y-3 p-5" onSubmit={async (e) => { e.preventDefault(); if (r.name.trim().length < 2 || !slugOk(r.slug)) return setErr("Название и адрес (латиница, цифры, дефис) обязательны"); if (await run(() => api("/admin/regions", { body: { ...r, center: r.center || null } }))) setR({ name: "", slug: "", center: "" }); }} noValidate>
          <h3 className="font-display text-xl text-forest">Новый регион</h3>
          <input aria-label="Название" placeholder="Название" className="field" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} />
          <input aria-label="Адрес" placeholder="адрес-латиницей" className="field" value={r.slug} onChange={(e) => setR({ ...r, slug: e.target.value.toLowerCase() })} />
          <input aria-label="Центр" placeholder="Административный центр" className="field" value={r.center} onChange={(e) => setR({ ...r, center: e.target.value })} />
          <button className="btn-primary w-full">Добавить</button>
        </form>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          <h2 className="mb-4 font-display text-2xl text-forest">Категории путешествий</h2>
          <ul className="space-y-2">
            {cats.map((x) => (
              <li key={x.id} className="card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{x.name} <span className="font-mono text-[12px] font-normal text-stone">/{x.slug}</span></p>
                  <p className="truncate text-[13px] text-stone">{x.tagline} · туров: {x.toursCount}</p>
                </div>
                <button aria-label={`Удалить ${x.name}`} onClick={() => confirm(`Удалить категорию «${x.name}»?`) && run(() => api(`/admin/categories/${x.id}`, { method: "DELETE" }))} className="text-stone hover:text-clay"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </div>
        <form className="card h-fit space-y-3 p-5" onSubmit={async (e) => { e.preventDefault(); if (c.name.trim().length < 2 || !slugOk(c.slug) || !c.tagline.trim() || !c.description.trim()) return setErr("Заполните название, адрес, подзаголовок и описание категории"); if (await run(() => api("/admin/categories", { body: { ...c, imageUrl: c.imageUrl || null, sortOrder: cats.length } }))) setC({ name: "", slug: "", tagline: "", description: "", imageUrl: "" }); }} noValidate>
          <h3 className="font-display text-xl text-forest">Новая категория</h3>
          <input aria-label="Название" placeholder="Название" className="field" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
          <input aria-label="Адрес" placeholder="адрес-латиницей" className="field" value={c.slug} onChange={(e) => setC({ ...c, slug: e.target.value.toLowerCase() })} />
          <input aria-label="Подзаголовок" placeholder="Подзаголовок" className="field" value={c.tagline} onChange={(e) => setC({ ...c, tagline: e.target.value })} />
          <textarea aria-label="Описание" placeholder="Описание" rows={3} className="field" value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} />
          <input aria-label="Ссылка на фото" placeholder="Фото: https://…" className="field" value={c.imageUrl} onChange={(e) => setC({ ...c, imageUrl: e.target.value })} />
          <button className="btn-primary w-full">Добавить</button>
        </form>
      </section>
    </div>
  );
}
