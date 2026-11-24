import Link from "next/link";
import { ArrowUpRight, Clock, Mountain, MapPin } from "lucide-react";
import { Img, Rating } from "@/components/ui";
import { DIFFICULTY, DIFFICULTY_LEVEL, POI_KIND, date, days, season, som } from "@/lib/format";
import type { ArticleCard as A, DestinationCard as D, PoiCard as P, TourCard as T } from "@/lib/types";
import { FavoriteButton } from "@/components/FavoriteButton";

/** Карточка направления: вертикальное фото с текстом поверх. */
export function DestinationCard({ d, size = "md", priority = false }: { d: D; size?: "md" | "lg"; priority?: boolean }) {
  return (
    <article className="group relative overflow-hidden rounded-sm bg-forest">
      <Link href={`/destinations/${d.slug}`} className="block">
        <div className={`zoom-img relative ${size === "lg" ? "aspect-[4/5] md:aspect-[5/6]" : "aspect-[3/4]"}`}>
          <Img photo={d.cover} alt={d.name} fill sizes="(max-width: 768px) 90vw, (max-width: 1280px) 45vw, 30vw" priority={priority} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <p className="eyebrow mb-2 text-white/75">{d.region}</p>
          <h3 className={`h-display ${size === "lg" ? "text-4xl md:text-5xl" : "text-[32px]"}`}>{d.name}</h3>
          <p className="mt-2 max-w-sm text-[14.5px] leading-snug text-white/80">{d.tagline}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold opacity-0 transition duration-500 group-hover:opacity-100">
            Открыть направление <ArrowUpRight size={15} />
          </span>
        </div>
      </Link>
      <div className="absolute top-4 right-4">
        <FavoriteButton destinationId={d.id} light />
      </div>
    </article>
  );
}

/** Карточка тура/маршрута с ключевыми параметрами для сравнения (п. 2.8 диплома). */
export function TourCard({ t }: { t: T }) {
  const level = DIFFICULTY_LEVEL[t.difficulty];
  return (
    <article className="group card relative flex flex-col overflow-hidden transition-shadow duration-500 hover:shadow-[0_20px_50px_-25px_rgba(17,36,27,0.45)]">
      <Link href={`/tours/${t.slug}`} className="flex flex-1 flex-col">
        <div className="zoom-img relative aspect-[16/11] overflow-hidden">
          <Img photo={t.cover} alt={t.title} fill sizes="(max-width: 768px) 92vw, (max-width: 1280px) 45vw, 30vw" />
          <span className="absolute bottom-3 left-3 rounded-xs bg-white/95 px-2 py-1 text-[11.5px] font-semibold text-forest">{t.category}</span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="mb-2 flex items-center gap-1.5 text-[12.5px] text-stone">
            <MapPin size={13} aria-hidden /> {t.region}
          </p>
          <h3 className="font-display text-[22px] leading-tight text-forest">{t.title}</h3>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-stone">
            <span className="inline-flex items-center gap-1.5"><Clock size={14} aria-hidden /> {days(t.days)}</span>
            <span className="inline-flex items-center gap-1.5" title={`Сложность: ${DIFFICULTY[t.difficulty]}`}>
              <span className="flex gap-0.5" aria-hidden>
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-2.5 w-1.5 rounded-[1px] ${i <= level ? "bg-turquoise" : "bg-graphite/15"}`} />
                ))}
              </span>
              {DIFFICULTY[t.difficulty]}
            </span>
            {t.maxAltitudeM && <span className="inline-flex items-center gap-1.5"><Mountain size={14} aria-hidden /> до {t.maxAltitudeM} м</span>}
            <span>{season(t.seasonFromMonth, t.seasonToMonth)}</span>
          </div>
          <div className="mt-auto flex items-end justify-between gap-3 border-t border-graphite/8 pt-4 mt-5">
            <div>
              <p className="text-[11.5px] text-stone">от</p>
              <p className="text-[19px] font-bold text-graphite">{som(t.priceFrom)}</p>
            </div>
            <div className="text-right">
              <Rating value={t.rating} count={t.reviewsCount} />
              <p className="mt-0.5 text-[11.5px] text-stone">{t.operatorName}</p>
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
  return (
    <article className="group">
      <Link href={`/journal/${a.slug}`} className="block">
        <div className={`zoom-img relative overflow-hidden rounded-sm ${large ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
          <Img photo={a.cover} alt={a.title} fill sizes="(max-width: 768px) 92vw, 40vw" />
        </div>
        <p className="eyebrow mt-5 text-turquoise">
          {a.topic} · {a.readingMinutes} мин
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
  return (
    <article className="group">
      <Link href={`/attractions/${p.slug}`} className="block">
        <div className="zoom-img relative aspect-[4/3] overflow-hidden rounded-sm">
          <Img photo={p.cover} alt={p.name} fill sizes="(max-width: 768px) 60vw, 24vw" />
        </div>
        <p className="eyebrow mt-4 text-turquoise">{POI_KIND[p.kind]}</p>
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
