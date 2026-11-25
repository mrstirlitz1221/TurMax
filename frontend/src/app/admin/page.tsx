"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { useI18n } from "@/i18n/client";

type Stats = { users: number; tourists: number; operators: number; operatorsPending: number; toursPublished: number; toursPending: number; bookings: number; bookingsActive: number; reviews: number; destinations: number; pois: number; articles: number };

export default function AdminOverview() {
  const { L } = useI18n();
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Stats>("/admin/stats").then(setS).catch((e) => setErr(errorMessage(e)));
  }, []);
  if (err) return <p className="text-clay">{err}</p>;
  if (!s) return <p className="text-stone">{L("Загрузка…")}</p>;
  const cards: [string, number, string?][] = [
    [L("Операторов ждут проверки"), s.operatorsPending, "/admin/operators"],
    [L("Туров на модерации"), s.toursPending, "/admin/tours"],
    [L("Активных заявок"), s.bookingsActive],
    [L("Отзывов"), s.reviews, "/admin/reviews"],
    [L("Пользователей"), s.users, "/admin/users"],
    [L("Туристов"), s.tourists],
    [L("Операторов"), s.operators, "/admin/operators"],
    [L("Опубликовано туров"), s.toursPublished],
    [L("Всего заявок"), s.bookings],
    [L("Направлений"), s.destinations, "/admin/content"],
    [L("Точек на карте"), s.pois, "/admin/content?type=poi"],
    [L("Статей"), s.articles, "/admin/content?type=articles"],
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-graphite/10 md:grid-cols-4">
      {cards.map(([k, v, href], i) => (
        <div key={k} className={`bg-white p-5 ${i < 2 && v > 0 ? "bg-[#fbf1dc]" : ""}`}>
          <dt className="text-[12.5px] text-stone">{k}</dt>
          <dd className="mt-1 font-display text-3xl text-forest">{href ? <Link href={href} className="hover:underline">{v}</Link> : v}</dd>
        </div>
      ))}
    </dl>
  );
}
