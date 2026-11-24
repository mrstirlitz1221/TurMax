"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { num, som } from "@/lib/format";
import { Rating } from "@/components/ui";

type Stats = {
  toursPublished: number; toursTotal: number; views: number; bookingsTotal: number; bookingsNew: number; bookingsConfirmed: number;
  bookingsCompleted: number; revenue: number; rating: number; reviewsCount: number; tours: { title: string; views: number; bookings: number; conversion: number }[];
};

/** Статистика просмотров и заявок (FR-16). */
export default function OperatorOverview() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Stats>("/operator/stats").then(setS).catch((e) => setErr(errorMessage(e)));
  }, []);
  if (err) return <p className="text-clay">{err}</p>;
  if (!s) return <p className="text-stone">Загрузка…</p>;
  const max = Math.max(1, ...s.tours.map((t) => t.views));
  return (
    <div className="space-y-12">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-graphite/10 md:grid-cols-4">
        {[
          ["Новые заявки", s.bookingsNew, "/operator/bookings"],
          ["Подтверждено", s.bookingsConfirmed, null],
          ["Просмотры туров", num(s.views), null],
          ["Выручка по заявкам", som(s.revenue), null],
        ].map(([k, v, href]) => (
          <div key={k as string} className="bg-white p-5">
            <dt className="text-[12.5px] text-stone">{k}</dt>
            <dd className="mt-1 font-display text-3xl text-forest">{href ? <Link href={href as string} className="hover:underline">{v}</Link> : v}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
        <div>
          <h2 className="mb-4 font-display text-2xl text-forest">Туры: просмотры и заявки</h2>
          {s.tours.length === 0 ? (
            <p className="text-stone">Туров пока нет. <Link href="/operator/tours/new" className="font-semibold text-forest underline">Создать тур</Link></p>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-[12px] text-stone uppercase">
                  <th className="pb-2 font-semibold">Тур</th>
                  <th className="pb-2 font-semibold">Просмотры</th>
                  <th className="pb-2 text-right font-semibold">Заявки</th>
                  <th className="pb-2 text-right font-semibold">Конверсия</th>
                </tr>
              </thead>
              <tbody>
                {s.tours.map((t) => (
                  <tr key={t.title} className="border-t border-graphite/8">
                    <td className="py-3 pr-3">{t.title}</td>
                    <td className="w-[30%] py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-mist"><div className="h-2 rounded-full bg-turquoise" style={{ width: `${(t.views / max) * 100}%` }} /></div>
                        <span className="w-10 text-right tabular-nums">{t.views}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right tabular-nums">{t.bookings}</td>
                    <td className="py-3 text-right tabular-nums">{t.conversion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card h-fit p-5">
          <p className="text-[12.5px] text-stone">Рейтинг оператора</p>
          <div className="mt-2"><Rating value={s.rating} count={s.reviewsCount} /></div>
          <p className="mt-4 text-[12.5px] text-stone">Туров опубликовано</p>
          <p className="font-display text-2xl text-forest">{s.toursPublished} из {s.toursTotal}</p>
          <p className="mt-4 text-[12.5px] text-stone">Всего заявок / завершено</p>
          <p className="font-display text-2xl text-forest">{s.bookingsTotal} / {s.bookingsCompleted}</p>
        </div>
      </div>
    </div>
  );
}
