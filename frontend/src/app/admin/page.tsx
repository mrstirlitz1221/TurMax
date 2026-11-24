"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";

type Stats = { users: number; tourists: number; operators: number; operatorsPending: number; toursPublished: number; toursPending: number; bookings: number; bookingsActive: number; reviews: number; destinations: number; pois: number; articles: number };

export default function AdminOverview() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Stats>("/admin/stats").then(setS).catch((e) => setErr(errorMessage(e)));
  }, []);
  if (err) return <p className="text-clay">{err}</p>;
  if (!s) return <p className="text-stone">Загрузка…</p>;
  const cards: [string, number, string?][] = [
    ["Операторов ждут проверки", s.operatorsPending, "/admin/operators"],
    ["Туров на модерации", s.toursPending, "/admin/tours"],
    ["Активных заявок", s.bookingsActive],
    ["Отзывов", s.reviews, "/admin/reviews"],
    ["Пользователей", s.users, "/admin/users"],
    ["Туристов", s.tourists],
    ["Операторов", s.operators, "/admin/operators"],
    ["Опубликовано туров", s.toursPublished],
    ["Всего заявок", s.bookings],
    ["Направлений", s.destinations, "/admin/content"],
    ["Точек на карте", s.pois, "/admin/content?type=poi"],
    ["Статей", s.articles, "/admin/content?type=articles"],
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
