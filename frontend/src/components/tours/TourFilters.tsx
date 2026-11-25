"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { DIFFICULTY, LANG, MONTHS } from "@/lib/format";
import type { Category, Region } from "@/lib/types";
import { useI18n } from "@/i18n/client";

const DAY_RANGES = [
  { v: "", label: "Любая" },
  { v: "1-1", label: "1 день" },
  { v: "2-3", label: "2–3 дня" },
  { v: "4-7", label: "4–7 дней" },
  { v: "8-60", label: "Больше недели" },
];

/** Фильтры каталога (FR-01): регион, длительность, сложность, сезон, тип, бюджет, язык гида. Состояние хранится в URL. */
export function TourFilters({ regions, categories }: { regions: Region[]; categories: Category[] }) {
  const { L, monthName } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [price, setPrice] = useState(sp.get("priceMax") ?? "");

  useEffect(() => setQ(sp.get("q") ?? ""), [sp]);

  const update = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    p.delete("page");
    start(() => router.push(`${pathname}?${p.toString()}`, { scroll: false }));
  };

  const days = sp.get("daysMin") ? `${sp.get("daysMin")}-${sp.get("daysMax")}` : "";
  const activeCount = ["region", "category", "daysMin", "difficulty", "month", "priceMax", "lang", "destination"].filter((k) => sp.get(k)).length;

  const select = "field !py-2 text-[14px]";
  const body = (
    <div className="grid gap-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q.trim() || null });
        }}
      >
        <label htmlFor="f-q" className="label">{L("Поиск")}</label>
        <input id="f-q" className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("Название или описание")} />
      </form>
      <div>
        <label htmlFor="f-region" className="label">{L("Регион")}</label>
        <select id="f-region" className={select} value={sp.get("region") ?? ""} onChange={(e) => update({ region: e.target.value || null })}>
          <option value="">{L("Все регионы")}</option>
          {regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="f-cat" className="label">{L("Тип путешествия")}</label>
        <select id="f-cat" className={select} value={sp.get("category") ?? ""} onChange={(e) => update({ category: e.target.value || null })}>
          <option value="">{L("Любой")}</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>
      <fieldset>
        <legend className="label">{L("Длительность")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {DAY_RANGES.map((d) => (
            <button
              key={d.v}
              type="button"
              aria-pressed={days === d.v}
              onClick={() => {
                const [a, b] = d.v ? d.v.split("-") : [null, null];
                update({ daysMin: a, daysMax: b });
              }}
              className={`rounded-xs border px-2.5 py-1.5 text-[13px] ${days === d.v ? "border-forest bg-forest text-white" : "border-graphite/15 bg-white hover:border-forest"}`}
            >
              {L(d.label)}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="f-diff" className="label">{L("Сложность")}</label>
        <select id="f-diff" className={select} value={sp.get("difficulty") ?? ""} onChange={(e) => update({ difficulty: e.target.value || null })}>
          <option value="">{L("Любая")}</option>
          {Object.entries(DIFFICULTY).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="f-month" className="label">{L("Месяц поездки")}</label>
        <select id="f-month" className={select} value={sp.get("month") ?? ""} onChange={(e) => update({ month: e.target.value || null })}>
          <option value="">{L("Любой")}</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{monthName(i + 1).replace(/^./, (ch) => ch.toUpperCase())}</option>)}
        </select>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ priceMax: price && Number(price) > 0 ? String(Number(price)) : null });
        }}
      >
        <label htmlFor="f-price" className="label">{L("Бюджет на человека, до (сом)")}</label>
        <div className="flex gap-2">
          <input id="f-price" type="number" inputMode="numeric" min={0} step={500} className="field" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={L("Например, 20000")} />
          <button type="submit" className="btn-outline !px-3">{L("ОК")}</button>
        </div>
      </form>
      <div>
        <label htmlFor="f-lang" className="label">{L("Язык гида")}</label>
        <select id="f-lang" className={select} value={sp.get("lang") ?? ""} onChange={(e) => update({ lang: e.target.value || null })}>
          <option value="">{L("Любой")}</option>
          {Object.entries(LANG).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}
        </select>
      </div>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setPrice("");
            start(() => router.push(pathname, { scroll: false }));
          }}
          className="btn-outline"
        >
          {L("Сбросить фильтры (")}{activeCount})
        </button>
      )}
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-outline w-full lg:hidden">
        <SlidersHorizontal size={16} /> {L("Фильтры")} {activeCount > 0 && `(${activeCount})`}
      </button>
      <div className={`hidden lg:block ${pending ? "opacity-60" : ""}`}>{body}</div>
      {open && (
        <div className="fixed inset-0 z-[1100] flex flex-col bg-sand-light lg:hidden" role="dialog" aria-modal="true" aria-label={L("Фильтры")}>
          <div className="flex items-center justify-between border-b border-graphite/10 px-5 py-4">
            <p className="font-display text-2xl text-forest">{L("Фильтры")}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label={L("Закрыть")} className="grid h-10 w-10 place-items-center">
              <X />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{body}</div>
          <div className="border-t border-graphite/10 p-4">
            <button type="button" onClick={() => setOpen(false)} className="btn-primary w-full">{L("Показать маршруты")}</button>
          </div>
        </div>
      )}
    </>
  );
}

export function SortSelect() {
  const { L } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-[14px] text-stone">
      {L("Сортировка:")}
      <select
        className="field !w-auto !py-1.5 text-[14px]"
        value={sp.get("sort") ?? ""}
        onChange={(e) => {
          const p = new URLSearchParams(sp.toString());
          if (e.target.value) p.set("sort", e.target.value); else p.delete("sort");
          p.delete("page");
          router.push(`${pathname}?${p}`, { scroll: false });
        }}
      >
        <option value="">{L("Популярные")}</option>
        <option value="rating">{L("По рейтингу")}</option>
        <option value="price">{L("Сначала дешевле")}</option>
        <option value="priceDesc">{L("Сначала дороже")}</option>
        <option value="days">{L("По длительности")}</option>
        <option value="new">{L("Новые")}</option>
      </select>
    </label>
  );
}
