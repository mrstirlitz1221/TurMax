"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useI18n } from "@/i18n/client";

type Field = { field: string; source: string; value?: string | null };
type Data = { entityType: string; entityId: string; lang: string; fields: Field[] };

const FIELD_LABELS: Record<string, string> = {
  Name: "Название", Title: "Заголовок", Tagline: "Подзаголовок", Summary: "Краткое описание", Description: "Подробное описание",
  BestTime: "Лучшее время для посещения", Highlights: "Особенности (по одной на строку)", Season: "Сезон", Lead: "Лид (вступление)",
  Body: "Текст статьи", Topic: "Рубрика", AuthorName: "Автор", Recommendations: "Рекомендации (по строке)", Includes: "Входит в стоимость (по строке)",
  Center: "Административный центр",
};
const BACK: Record<string, string> = {
  destinations: "/admin/content?type=destinations", poi: "/admin/content?type=poi", articles: "/admin/content?type=articles",
  tours: "/admin/tours", categories: "/admin/dictionaries", regions: "/admin/dictionaries",
};

/** Перевод контента на кыргызский и английский (справочник переводов, табл. 1.3: «ведение справочников и переводов»). */
export function TranslationEditor({ kind, id }: { kind: string; id: string }) {
  const { L } = useI18n();
  const [lang, setLang] = useState<"ky" | "en">("ky");
  const [data, setData] = useState<Data | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setData(null);
    setMsg(null);
    api<Data>(`/admin/translations/${kind}/${id}/${lang}`)
      .then((d) => {
        setData(d);
        setValues(Object.fromEntries(d.fields.map((f) => [f.field, f.value ?? ""])));
      })
      .catch((e) => setMsg({ ok: false, text: errorMessage(e) }));
  }, [kind, id, lang]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api<Data>(`/admin/translations/${kind}/${id}/${lang}`, { method: "PUT", body: { values } });
      setData(d);
      setMsg({ ok: true, text: L("Перевод сохранён") });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const name = data?.fields.find((f) => f.field === "Name" || f.field === "Title")?.source;
  const long = (f: Field) => f.source.length > 120 || ["Description", "Body", "Highlights", "Recommendations", "Includes", "Summary", "Lead"].includes(f.field);

  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={BACK[kind] ?? "/admin"} className="text-[13px] text-stone hover:text-forest">{L("← К списку")}</Link>
          <h2 className="mt-1 font-display text-3xl text-forest">{L("Перевод")}{name ? `: ${name}` : ""}</h2>
          <p className="mt-1 text-[13.5px] text-stone">{L("Пустое поле — показывается русский текст.")}</p>
        </div>
        <div className="flex rounded-sm border border-graphite/15 bg-white p-0.5" role="tablist" aria-label={L("Язык интерфейса")}>
          {(["ky", "en"] as const).map((l) => (
            <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)} className={`rounded-xs px-4 py-2 text-[14px] font-semibold ${lang === l ? "bg-forest text-white" : "text-stone"}`}>
              {l === "ky" ? "Кыргызча" : "English"}
            </button>
          ))}
        </div>
      </div>
      {!data ? (
        <p className="text-stone">{msg?.text ?? L("Загрузка…")}</p>
      ) : (
        <div className="space-y-4">
          {data.fields.map((f) => (
            <div key={f.field} className="card grid gap-4 p-5 lg:grid-cols-2">
              <div>
                <p className="label">{L(FIELD_LABELS[f.field] ?? f.field)} · <span className="font-normal text-stone">{L("Исходный текст (русский)")}</span></p>
                <div className="max-h-64 overflow-y-auto rounded-sm bg-sand-light p-3 text-[14px] whitespace-pre-wrap text-graphite/85">{f.source || "—"}</div>
              </div>
              <div>
                <label htmlFor={`tr-${f.field}`} className="label">{L("Перевод")} ({lang.toUpperCase()})</label>
                {long(f) ? (
                  <textarea id={`tr-${f.field}`} lang={lang} rows={Math.min(14, Math.max(3, Math.ceil(f.source.length / 90)))} className="field" value={values[f.field] ?? ""} onChange={(e) => setValues({ ...values, [f.field]: e.target.value })} />
                ) : (
                  <input id={`tr-${f.field}`} lang={lang} className="field" value={values[f.field] ?? ""} onChange={(e) => setValues({ ...values, [f.field]: e.target.value })} />
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4">
            <button disabled={busy} className="btn-primary">{busy ? L("Сохраняем…") : L("Сохранить перевод")}</button>
            {msg && <p className={`text-[14px] ${msg.ok ? "text-turquoise" : "text-clay"}`} role="status">{msg.text}</p>}
          </div>
        </div>
      )}
    </form>
  );
}
