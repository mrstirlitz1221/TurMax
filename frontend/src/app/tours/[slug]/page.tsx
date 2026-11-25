import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BadgeCheck, CalendarRange, Check, Clock, Languages, Mountain, Route } from "lucide-react";
import { apiGet } from "@/lib/api-server";
import type { Tour } from "@/lib/types";
import { PageHero } from "@/components/PageHero";
import { Gallery } from "@/components/Gallery";
import { RichText } from "@/components/RichText";
import { Rating } from "@/components/ui";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PlaceMap } from "@/components/map/PlaceMap";
import { BookingPanel } from "@/components/tours/BookingPanel";
import { DIFFICULTY, LANG, OPERATOR_KIND, POI_KIND } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import { UntranslatedNote } from "@/components/UntranslatedNote";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { L } = await getI18n();
  const t = await apiGet<Tour>(`/tours/${(await params).slug}`, 0);
  if (!t) return { title: L("Тур не найден") };
  return { title: t.title, description: t.summary, openGraph: { title: t.title, description: t.summary, images: t.photos[0] ? [t.photos[0].url] : [] } };
}

export default async function TourPage({ params }: P) {
  const { L, som, date, days, season } = await getI18n();
  const t = await apiGet<Tour>(`/tours/${(await params).slug}`, 0);
  if (!t) notFound();

  const byDay = Array.from({ length: t.days }, (_, i) => ({ day: i + 1, points: t.points.filter((p) => p.day === i + 1) }));
  const line = t.points.map((p) => [p.latitude, p.longitude] as [number, number]);
  const seen = new Set<string>();
  const markers = t.points
    .filter((p) => (seen.has(p.poiId) ? false : (seen.add(p.poiId), true)))
    .map((p, i) => ({ id: p.poiId, name: p.name, lat: p.latitude, lng: p.longitude, type: "poi" as const, kind: p.kind, label: String(i + 1), url: `/attractions/${p.poiSlug}`, summary: `${L("День {n}", { n: p.day })}${p.note ? ` · ${p.note}` : ""}` }));

  const facts = [
    { icon: Clock, label: L("Длительность"), value: days(t.days) },
    { icon: Route, label: L("Сложность"), value: L(DIFFICULTY[t.difficulty]) },
    { icon: CalendarRange, label: L("Сезон"), value: season(t.seasonFromMonth, t.seasonToMonth) },
    { icon: Mountain, label: L("Макс. высота"), value: t.maxAltitudeM ? L("{n} м", { n: t.maxAltitudeM }) : "—" },
    { icon: Languages, label: L("Язык гида"), value: t.guideLanguages.map((l) => (LANG[l] ? L(LANG[l]) : l)).join(", ") },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org", "@type": "TouristTrip", name: t.title, description: t.summary,
            provider: { "@type": "Organization", name: t.operator.name },
            offers: { "@type": "Offer", price: t.priceFrom, priceCurrency: "KGS" },
          }),
        }}
      />
      <PageHero
        photo={t.photos[0]}
        ridge="#ffffff"
        crumbs={[{ href: "/", label: L("Главная") }, { href: "/tours", label: L("Маршруты") }, { label: t.title }]}
        eyebrow={`${t.category.name} · ${t.region.name}`}
        title={t.title}
        subtitle={t.summary}
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="rounded-sm bg-white/95 px-4 py-2.5 text-forest">
            <span className="text-[12px] text-stone">{L("от")} </span>
            <b className="text-lg">{som(t.priceFrom)}</b>
          </span>
          <Rating value={t.rating} count={t.reviewsCount} light />
          <FavoriteButton tourId={t.id} light />
        </div>
      </PageHero>

      <div className="border-b border-graphite/8 bg-white">
        <dl className="container-x no-scrollbar flex gap-8 overflow-x-auto py-5 md:justify-between">
          {facts.map((f) => (
            <div key={f.label} className="flex shrink-0 items-center gap-3">
              <f.icon size={20} className="text-turquoise" aria-hidden />
              <div>
                <dt className="text-[11.5px] font-semibold tracking-wider text-stone uppercase">{f.label}</dt>
                <dd className="text-[15px] font-semibold">{f.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <section className="container-x grid gap-14 py-16 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {t.needsPermit && (
            <div className="mb-8 flex gap-3 rounded-sm border border-[#e7c98d] bg-[#fbf1dc] p-4 text-[15px] text-[#6e4a0e]">
              <AlertTriangle size={20} className="shrink-0" aria-hidden />
              {L("Маршрут проходит через пограничную зону — нужен пропуск. Оператор поможет его оформить после подтверждения заявки.")}
            </div>
          )}
          <UntranslatedNote show={t.untranslated} />
          <RichText text={t.description} />

          <h2 className="h-display mt-16 mb-8 text-[34px] text-forest sm:text-[42px]">{L("Программа по дням")}</h2>
          <ol className="relative space-y-0 border-l border-forest/20 pl-8">
            {byDay.map((d) => (
              <li key={d.day} className="relative pb-10 last:pb-0">
                <span className="absolute top-0 -left-[49px] grid h-9 w-9 place-items-center rounded-full bg-forest text-[13px] font-bold text-white">{d.day}</span>
                <p className="eyebrow text-turquoise">{L("День")} {d.day}</p>
                {d.points.length === 0 ? (
                  <p className="mt-2 text-stone">{L("Переход по маршруту и отдых.")}</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {d.points.map((p) => (
                      <li key={`${p.poiId}-${p.order}`} className="card p-4">
                        <Link href={`/attractions/${p.poiSlug}`} className="font-display text-xl text-forest hover:underline">{p.name}</Link>
                        <p className="mt-0.5 text-[13px] text-stone">
                          {L(POI_KIND[p.kind])}{p.altitudeM ? ` · ${L("{n} м", { n: p.altitudeM })}` : ""}{p.note ? ` · ${p.note}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>

          <h2 className="h-display mt-16 mb-6 text-[34px] text-forest">{L("Карта маршрута")}</h2>
          <div className="h-[420px] overflow-hidden rounded-sm border border-graphite/10">
            <PlaceMap markers={markers} line={line} />
          </div>
          <p className="mt-2 text-[12.5px] text-stone">{L("Линия соединяет точки программы по порядку и не повторяет реальную дорогу.")}</p>

          {t.photos.length > 1 && (
            <>
              <h2 className="h-display mt-16 mb-6 text-[34px] text-forest">{L("Галерея")}</h2>
              <Gallery photos={t.photos} title={t.title} />
            </>
          )}

          <div className="mt-16 grid gap-10 md:grid-cols-2">
            {t.includes.length > 0 && (
              <div>
                <h2 className="font-display text-2xl text-forest">{L("Входит в стоимость")}</h2>
                <ul className="mt-4 space-y-2.5">
                  {t.includes.map((x) => (
                    <li key={x} className="flex gap-2.5 text-[15px]"><Check size={18} className="mt-0.5 shrink-0 text-turquoise" aria-hidden /> {x}</li>
                  ))}
                </ul>
              </div>
            )}
            {t.recommendations.length > 0 && (
              <div>
                <h2 className="font-display text-2xl text-forest">{L("Рекомендации туристам")}</h2>
                <ul className="mt-4 space-y-2.5">
                  {t.recommendations.map((x) => (
                    <li key={x} className="flex gap-2.5 text-[15px]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" aria-hidden /> {x}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <h2 id="reviews" className="h-display mt-16 mb-6 text-[34px] text-forest">{L("Отзывы")}</h2>
          {t.reviews.length === 0 ? (
            <p className="text-stone">{L("Отзывов пока нет. Оставить отзыв может турист, совершивший поездку по этому маршруту.")}</p>
          ) : (
            <ul className="space-y-5">
              {t.reviews.map((r) => (
                <li key={r.id} className="card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <b>{r.author}</b>
                    <Rating value={r.rating} count={1} />
                  </div>
                  <p className="mt-1 text-[12.5px] text-stone">{date(r.createdAt)}</p>
                  <p className="mt-3 text-[15px] leading-relaxed">{r.text}</p>
                  {r.operatorReply && (
                    <div className="mt-4 border-l-2 border-turquoise bg-sand-light p-3 text-[14px]">
                      <p className="mb-1 text-[12px] font-semibold text-turquoise">{L("Ответ оператора")}</p>
                      {r.operatorReply}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          <BookingPanel departures={t.departures} tourSlug={t.slug} />
          <div className="card p-5">
            <p className="text-[12px] font-semibold tracking-wider text-stone uppercase">{L("Оператор")}</p>
            <p className="mt-2 flex items-center gap-2 font-display text-xl text-forest">
              {t.operator.name}
              {t.operator.verified && <BadgeCheck size={18} className="text-turquoise" aria-label={L("Проверен администратором")} />}
            </p>
            <p className="text-[13px] text-stone">{L(OPERATOR_KIND[t.operator.kind])}</p>
            <p className="mt-3 text-[14px] leading-relaxed text-stone">{t.operator.description}</p>
            <div className="mt-3"><Rating value={t.operator.rating} count={t.operator.reviewsCount} /></div>
          </div>
        </aside>
      </section>
    </>
  );
}
