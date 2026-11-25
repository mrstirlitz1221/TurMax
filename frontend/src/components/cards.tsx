"use client";

import Link from "next/link";
import { ArrowUpRight, Clock, Mountain, MapPin } from "lucide-react";
import { Rating } from "@/components/ui";
import { DIFFICULTY, DIFFICULTY_LEVEL, POI_KIND } from "@/lib/format";
import type { ArticleCard as A, DestinationCard as D, PoiCard as P, TourCard as T } from "@/lib/types";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ParallaxImage } from "@/components/parallax";
import { useI18n } from "@/i18n/client";

/** Карточка направления: вертикальное фото, текст поверх; при наведении раскрывается описание. */
export function DestinationCard({ d, size = "md", priority = false }: { d: D; size?: "md" | "lg" | "tall" | "wide"; priority?: boolean }) {
  const { L } = useI18n();
  const aspect = { md: "aspect-[3/4]", lg: "aspect-[4/5] md:aspect-[5/6]", tall: "aspect-[3/4] lg:aspect-[3/5]", wide: "aspect-[4/5] sm:aspect-[16/11]" }[size];
  return (
    <article className="group card-lift relative overflow-hidden rounded-sm bg-forest">
      <Link href={`/destinations/${d.slug}`} className="block">
        <div className={`relative ${aspect}`}>
          <ParallaxImage photo={d.cover} alt={d.name} strength={size === "md" ? 9 : 12} sizes="(max-width: 768px) 90vw, (max-width: 1280px) 45vw, 33vw" priority={priority} className="zoom-img !absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent transition-opacity duration-700 group-hover:opacity-95" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-7">
          <p className="eyebrow mb-2 text-white/75">{d.region}</p>
          <h3 className={`h-display ${size === "md" ? "text-[32px]" : "text-4xl md:text-5xl"}`}>{d.name}</h3>
          <p className="mt-2 max-w-sm text-[14.5px] leading-snug text-white/85">{d.tagline}</p>
          <div className="card-reveal">
            <div>
              <p className="mt-3 line-clamp-3 max-w-md text-[13.5px] leading-relaxed text-white/70">{d.summary}</p>
              {d.categories.length > 0 && (
                <p className="mt-3 flex flex-wrap gap-1.5">
                  {d.categories.slice(0, 3).map((c) => (
                    <span key={c} className="rounded-xs border border-white/30 px-2 py-0.5 text-[11.5px] text-white/85">{c}</span>
                  ))}
                </p>
              )}
            </div>
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold">
            {L("Открыть направление")} <ArrowUpRight size={15} className="transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </div>
      </Link>
      <div className="absolute top-4 right-4">
        <FavoriteButton destinationId={d.id} light />
      </div>
    </article>
  );
}

/**
 * Карточка тура/маршрута: фото во всю высоту, параметры для сравнения (п. 2.8 диплома) поверх,
 * при наведении раскрываются описание, сезон и высота.
 */
export function TourCard({ t, priority = false }: { t: T; priority?: boolean }) {
  const { L, som, days, season } = useI18n();
  const level = DIFFICULTY_LEVEL[t.difficulty];
  return (
    <article className="group card-lift relative overflow-hidden rounded-sm bg-forest text-white">
      <Link href={`/tours/${t.slug}`} className="block">
        <div className="relative aspect-[4/5]">
          <ParallaxImage photo={t.cover} alt={t.title} strength={9} priority={priority} sizes="(max-width: 768px) 92vw, (max-width: 1280px) 45vw, 30vw" className="zoom-img !absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        </div>
        <span className="absolute top-4 left-4 rounded-xs bg-white/95 px-2.5 py-1 text-[11.5px] font-semibold text-forest">{t.category}</span>
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="mb-2 flex items-center gap-1.5 text-[12.5px] text-white/75">
            <MapPin size={13} aria-hidden /> {t.region}
          </p>
          <h3 className="font-display text-[25px] leading-[1.15]">{t.title}</h3>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-white/85">
            <span className="inline-flex items-center gap-1.5"><Clock size={14} aria-hidden /> {days(t.days)}</span>
            <span className="inline-flex items-center gap-1.5" title={L("Сложность: {value}", { value: L(DIFFICULTY[t.difficulty]) })}>
              <span className="flex gap-0.5" aria-hidden>
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-2.5 w-1.5 rounded-[1px] ${i <= level ? "bg-turquoise-light" : "bg-white/25"}`} />
                ))}
              </span>
              {L(DIFFICULTY[t.difficulty])}
            </span>
          </div>
          <div className="card-reveal">
            <div>
              <p className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-white/75">{t.summary}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 text-[12.5px] text-white/70">
                <span>{L("Сезон:")} {season(t.seasonFromMonth, t.seasonToMonth)}</span>
                {t.maxAltitudeM && <span className="inline-flex items-center gap-1"><Mountain size={13} aria-hidden /> {L("до")} {t.maxAltitudeM} {L("м")}</span>}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/20 pt-4">
            <div>
              <p className="text-[11.5px] text-white/65">{L("от")}</p>
              <p className="text-[19px] font-bold">{som(t.priceFrom)}</p>
            </div>
            <div className="text-right">
              <Rating value={t.rating} count={t.reviewsCount} light />
              <p className="mt-0.5 text-[11.5px] text-white/65">{t.operatorName}</p>
            </div>
          </div>
        </div>
      </Link>
      <div className="absolute top-3 right-3">
        <FavoriteButton tourId={t.id} light />
      </div>
    </article>
  );
}

export function ArticleCard({ a, large = false }: { a: A; large?: boolean }) {
  const { L, date } = useI18n();
  return (
    <article className="group">
      <Link href={`/journal/${a.slug}`} className="block">
        <ParallaxImage photo={a.cover} alt={a.title} strength={8} sizes="(max-width: 768px) 92vw, 40vw" className={`zoom-img rounded-sm ${large ? "aspect-[16/10]" : "aspect-[4/3]"}`} />
        <p className="eyebrow mt-5 text-turquoise">
          {a.topic} · {a.readingMinutes} {L("мин")}
        </p>
        <h3 className={`mt-2 font-display leading-tight text-forest group-hover:underline decoration-1 underline-offset-4 ${large ? "text-[34px]" : "text-[24px]"}`}>
          {a.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-stone">{a.lead}</p>
        <p className="mt-3 text-[12.5px] text-stone/80">{date(a.publishedAt)}</p>
      </Link>
    </article>
  );
}

export function PoiCard({ p }: { p: P }) {
  const { L } = useI18n();
  return (
    <article className="group">
      <Link href={`/attractions/${p.slug}`} className="block">
        <ParallaxImage photo={p.cover} alt={p.name} strength={8} sizes="(max-width: 768px) 60vw, 24vw" className="zoom-img aspect-[4/3] rounded-sm" />
        <p className="eyebrow mt-4 text-turquoise">{L(POI_KIND[p.kind])}</p>
        <h3 className="mt-1.5 font-display text-[21px] leading-tight text-forest">{p.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-[14px] text-stone">{p.summary}</p>
      </Link>
    </article>
  );
}

/** Горизонтальная лента карточек со свайпом на мобильных. */
export function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 [&>*]:w-[72vw] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-[44vw] lg:[&>*]:w-auto">
      {children}
    </div>
  );
}
