"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { SERVICE, VEHICLE } from "@/lib/format";
import type { ServiceType, VehicleType } from "@/lib/types";
import { useI18n } from "@/i18n/client";

type Service = { id: string; type: ServiceType; vehicleType?: VehicleType | null; name: string; price: number };

/** Тарифы оператора (таблица services) — используются конструктором для расчёта сметы. */
export default function ServicesPage() {
  const { L, som } = useI18n();
  const [items, setItems] = useState<Service[]>([]);
  const [f, setF] = useState<{ type: ServiceType; vehicleType: VehicleType; name: string; price: string }>({ type: "Transport", vehicleType: "Minivan", name: "", price: "" });
  const [err, setErr] = useState<string | null>(null);

  const load = () => api<Service[]>("/operator/services").then(setItems).catch((e) => setErr(errorMessage(e)));
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.name.trim().length < 2 || !(Number(f.price) > 0)) return setErr(L("Укажите название и цену больше нуля"));
    try {
      await api("/operator/services", { body: { type: f.type, vehicleType: f.type === "Transport" ? f.vehicleType : null, name: f.name.trim(), price: Number(f.price) } });
      setF({ ...f, name: "", price: "" });
      setErr(null);
      load();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  const update = async (s: Service, price: number) => {
    if (!(price > 0)) return;
    try {
      await api(`/operator/services/${s.id}`, { method: "PUT", body: { type: s.type, vehicleType: s.vehicleType, name: s.name, price } });
      load();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  const remove = async (id: string) => {
    await api(`/operator/services/${id}`, { method: "DELETE" }).catch((e) => setErr(errorMessage(e)));
    load();
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div>
        <p className="mb-6 max-w-2xl text-[14.5px] text-stone">
          {L("По этим тарифам конструктор рассчитывает смету: транспорт — за километр с учётом типа дороги, проживание и питание — за человека, гид — за день.")}
        </p>
        <table className="w-full text-[14.5px]">
          <thead><tr className="text-left text-[12px] text-stone uppercase"><th className="pb-2">{L("Услуга")}</th><th className="pb-2">{L("Тип")}</th><th className="pb-2 text-right">{L("Цена")}</th><th /></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-graphite/8">
                <td className="py-3">{s.name}{s.vehicleType && <span className="block text-[12px] text-stone">{L(VEHICLE[s.vehicleType])}</span>}</td>
                <td className="py-3 text-[13px] text-stone">{L(SERVICE[s.type])}</td>
                <td className="py-3 text-right">
                  <input type="number" min={1} defaultValue={s.price} aria-label={L("Цена: {name}", { name: s.name })} title={som(s.price)} onBlur={(e) => Number(e.target.value) !== s.price && update(s, Number(e.target.value))} className="field !w-28 !py-1 text-right" />
                </td>
                <td className="py-3 pl-3 text-right"><button onClick={() => remove(s.id)} aria-label={L("Удалить {name}", { name: s.name })} className="text-stone hover:text-clay"><Trash2 size={16} /></button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="py-6 text-stone">{L("Тарифов пока нет — добавьте хотя бы транспорт, чтобы ваши цены участвовали в расчёте маршрутов.")}</td></tr>}
          </tbody>
        </table>
      </div>
      <form onSubmit={add} className="card h-fit space-y-4 p-6" noValidate>
        <h2 className="font-display text-xl text-forest">{L("Новый тариф")}</h2>
        <div><label htmlFor="s-type" className="label">{L("Тип")}</label><select id="s-type" className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as ServiceType })}>{Object.entries(SERVICE).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}</select></div>
        {f.type === "Transport" && <div><label htmlFor="s-veh" className="label">{L("Транспорт")}</label><select id="s-veh" className="field" value={f.vehicleType} onChange={(e) => setF({ ...f, vehicleType: e.target.value as VehicleType })}>{Object.entries(VEHICLE).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}</select></div>}
        <div><label htmlFor="s-name" className="label">{L("Название")}</label><input id="s-name" className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label htmlFor="s-price" className="label">{L("Цена, сом")}</label><input id="s-price" type="number" min={1} className="field" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
        {err && <p className="text-[13.5px] text-clay" role="alert">{err}</p>}
        <button className="btn-primary w-full">{L("Добавить")}</button>
      </form>
    </div>
  );
}
