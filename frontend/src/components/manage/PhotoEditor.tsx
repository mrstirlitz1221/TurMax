"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Trash2, Upload } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";

export type PhotoInput = { url: string; alt?: string | null; author?: string | null; license?: string | null; sourceUrl?: string | null };

/** Редактор фотографий: загрузка файла (JPG/PNG/WebP до 8 МБ) или ссылка, автор и лицензия, порядок. */
export function PhotoEditor({ value, onChange }: { value: PhotoInput[]; onChange: (v: PhotoInput[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (f: File) => {
    if (f.size > 8 * 1024 * 1024) return setErr("Файл больше 8 МБ");
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await api<{ url: string }>("/uploads", { form: fd });
      onChange([...value, { url: r.url }]);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const addUrl = () => {
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "https:") throw new Error();
      onChange([...value, { url: u.toString() }]);
      setUrl("");
      setErr(null);
    } catch {
      setErr("Укажите корректную ссылку https://…");
    }
  };
  const set = (i: number, p: Partial<PhotoInput>) => onChange(value.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const v = [...value];
    [v[i], v[j]] = [v[j], v[i]];
    onChange(v);
  };

  return (
    <div className="space-y-3">
      {value.map((p, i) => (
        <div key={p.url + i} className="flex gap-3 rounded-sm border border-graphite/10 bg-white p-3">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xs bg-mist">
            <Image src={p.url} alt="" fill sizes="112px" className="object-cover" />
          </div>
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
            <input aria-label="Описание фото" placeholder="Описание (alt)" className="field !py-1.5 text-[13px]" value={p.alt ?? ""} onChange={(e) => set(i, { alt: e.target.value })} />
            <input aria-label="Автор" placeholder="Автор" className="field !py-1.5 text-[13px]" value={p.author ?? ""} onChange={(e) => set(i, { author: e.target.value })} />
            <input aria-label="Лицензия" placeholder="Лицензия" className="field !py-1.5 text-[13px]" value={p.license ?? ""} onChange={(e) => set(i, { license: e.target.value })} />
            <input aria-label="Источник" placeholder="Ссылка на источник" className="field !py-1.5 text-[13px]" value={p.sourceUrl ?? ""} onChange={(e) => set(i, { sourceUrl: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <button type="button" aria-label="Выше" onClick={() => move(i, -1)} className="text-stone hover:text-forest"><ArrowUp size={15} /></button>
            <button type="button" aria-label="Ниже" onClick={() => move(i, 1)} className="text-stone hover:text-forest"><ArrowDown size={15} /></button>
            <button type="button" aria-label="Удалить фото" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-stone hover:text-clay"><Trash2 size={15} /></button>
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="btn-outline !py-2.5">
          <Upload size={16} /> {busy ? "Загрузка…" : "Загрузить файл"}
        </button>
        <input aria-label="Ссылка на изображение" placeholder="или вставьте ссылку https://…" className="field !py-2.5" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="button" onClick={addUrl} className="btn-outline !py-2.5">Добавить</button>
      </div>
      {err && <p className="text-[13px] text-clay">{err}</p>}
    </div>
  );
}
