"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Badge } from "@/components/ui";

type Item = { id: string; slug: string; name: string; extra?: string | null; published: boolean };
const CONTENT_TYPES = {
  destinations: { label: "Направления", api: "destinations", publicPath: "/destinations/" },
  poi: { label: "Места (точки интереса)", api: "poi", publicPath: "/attractions/" },
  articles: { label: "Статьи", api: "articles", publicPath: "/journal/" },
} as const;
type Type = keyof typeof CONTENT_TYPES;

function ContentList() {
  const sp = useSearchParams();
  const router = useRouter();
  const type = (sp.get("type") as Type) in CONTENT_TYPES ? (sp.get("type") as Type) : "destinations";
  const cfg = CONTENT_TYPES[type];
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = () => api<Item[]>(`/admin/${cfg.api}`).then(setItems).catch((e) => setErr(errorMessage(e)));
  useEffect(() => {
    setItems(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const remove = async (it: Item) => {
    if (!confirm(`Удалить «${it.name}»? Действие нельзя отменить.`)) return;
    try {
      await api(`/admin/${cfg.api}/${it.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  const shown = (items ?? []).filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Тип контента">
          {(Object.keys(CONTENT_TYPES) as Type[]).map((t) => (
            <button key={t} aria-pressed={t === type} onClick={() => router.push(`/admin/content?type=${t}`)} className={`rounded-xs border px-3.5 py-2 text-[13.5px] ${t === type ? "border-forest bg-forest text-white" : "border-graphite/15 bg-white"}`}>
              {CONTENT_TYPES[t].label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input aria-label="Фильтр" placeholder="Фильтр по названию" className="field !w-56 !py-2" value={q} onChange={(e) => setQ(e.target.value)} />
          <Link href={`/admin/content/${type}/new`} className="btn-accent !py-2"><Plus size={16} /> Добавить</Link>
        </div>
      </div>
      {err && <p className="mb-4 text-clay" role="alert">{err}</p>}
      {!items ? <p className="text-stone">Загрузка…</p> : (
        <ul className="divide-y divide-graphite/8 rounded-sm bg-white">
          {shown.map((it) => (
            <li key={it.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/admin/content/${type}/${it.id}`} className="min-w-0 flex-1">
                <span className="font-semibold text-forest hover:underline">{it.name}</span>
                <span className="ml-2 text-[13px] text-stone">{it.extra}</span>
              </Link>
              {!it.published && <Badge tone="warn">Скрыто</Badge>}
              <Link href={`${cfg.publicPath}${it.slug}`} className="text-[13px] text-turquoise hover:underline">На сайте</Link>
              <button aria-label={`Удалить ${it.name}`} onClick={() => remove(it)} className="text-stone hover:text-clay"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ContentPage() {
  return (
    <Suspense>
      <ContentList />
    </Suspense>
  );
}
