"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { OPERATOR_KIND, VERIFICATION } from "@/lib/format";
import type { OperatorKind, Verification } from "@/lib/types";
import { ProfileForm } from "@/components/account/ProfileForm";
import { useI18n } from "@/i18n/client";

type Profile = { name: string; kind: OperatorKind; description: string; phone?: string | null; email?: string | null; website?: string | null; margin: number; verification: Verification };

/** Профиль компании оператора (FR-13). */
export default function OperatorProfilePage() {
  const { L } = useI18n();
  const [p, setP] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    api<Profile>("/operator/profile").then(setP).catch((e) => setMsg({ ok: false, text: errorMessage(e) }));
  }, []);
  if (!p) return <p className="text-stone">{msg?.text ?? L("Загрузка…")}</p>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (p.name.trim().length < 2) return setMsg({ ok: false, text: L("Укажите название") });
    if (p.website && !/^https?:\/\//.test(p.website)) return setMsg({ ok: false, text: "Адрес сайта должен начинаться с http:// или https://" });
    try {
      setP(await api<Profile>("/operator/profile", { method: "PUT", body: { ...p, phone: p.phone || null, email: p.email || null, website: p.website || null } }));
      setMsg({ ok: true, text: L("Профиль сохранён") });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    }
  };

  return (
    <div className="space-y-12">
      <form onSubmit={save} className="card grid max-w-4xl gap-4 p-6 sm:grid-cols-2" noValidate>
        <h2 className="font-display text-2xl text-forest sm:col-span-2">{L("Профиль компании ·")} <span className="text-[15px] text-stone">{L(VERIFICATION[p.verification])}</span></h2>
        <div><label htmlFor="o-name" className="label">{L("Название")}</label><input id="o-name" className="field" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
        <div><label htmlFor="o-kind" className="label">{L("Тип")}</label><select id="o-kind" className="field" value={p.kind} onChange={(e) => setP({ ...p, kind: e.target.value as OperatorKind })}>{Object.entries(OPERATOR_KIND).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}</select></div>
        <div className="sm:col-span-2"><label htmlFor="o-desc" className="label">{L("Описание")}</label><textarea id="o-desc" rows={4} maxLength={4000} className="field" value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></div>
        <div><label htmlFor="o-phone" className="label">{L("Телефон")}</label><input id="o-phone" type="tel" className="field" value={p.phone ?? ""} onChange={(e) => setP({ ...p, phone: e.target.value })} /></div>
        <div><label htmlFor="o-email" className="label">E-mail</label><input id="o-email" type="email" className="field" value={p.email ?? ""} onChange={(e) => setP({ ...p, email: e.target.value })} /></div>
        <div><label htmlFor="o-web" className="label">{L("Сайт")}</label><input id="o-web" className="field" value={p.website ?? ""} onChange={(e) => setP({ ...p, website: e.target.value })} placeholder="https://…" /></div>
        <div>
          <label htmlFor="o-margin" className="label">{L("Наценка оператора, %")}</label>
          <input id="o-margin" type="number" min={0} max={50} className="field" value={Math.round(p.margin * 100)} onChange={(e) => setP({ ...p, margin: Math.min(50, Math.max(0, Number(e.target.value))) / 100 })} />
          <p className="mt-1 text-[12px] text-stone">{L("Используется в формуле сметы: C × k_сез × (1 + m_оп)")}</p>
        </div>
        {msg && <p className={`text-[14px] sm:col-span-2 ${msg.ok ? "text-turquoise" : "text-clay"}`} role="status">{msg.text}</p>}
        <button className="btn-primary sm:col-span-2 sm:w-fit">{L("Сохранить")}</button>
      </form>
      <ProfileForm />
    </div>
  );
}
