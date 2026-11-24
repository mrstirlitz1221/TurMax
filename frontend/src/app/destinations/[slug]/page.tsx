import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Route } from "lucide-react";
import { apiGet } from "@/lib/api-server";
import type { Destination } from "@/lib/types";
import { PageHero } from "@/components/PageHero";
import { Gallery } from "@/components/Gallery";
import { RichText } from "@/components/RichText";
import { ArticleCard, PoiCard, TourCard } from "@/components/cards";
import { SectionHeader } from "@/components/ui";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PlaceMap } from "@/components/map/PlaceMap";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await apiGet<Destination>(`/destinations/${(await params).slug}`);
  if (!d) return { title: "Направление не найдено" };
  return {
    title: d.name,
    description: d.summary,
    openGraph: { title: `${d.name} — ${d.tagline}`, description: d.summary, images: d.photos[0] ? [d.photos[0].url] : [] },
  };
}

export default async function DestinationPage({ params }: P) {
  const d = await apiGet<Destination>(`/destinations/${(await params).slug}`);
  if (!d) notFound();

  const markers = [
    { id: d.id, name: d.name, lat: d.latitude, lng: d.longitude, type: "destination" as const, summary: d.tagline },
    ...d.attractions.map((a) => ({ id: a.id, name: a.name, lat: a.latitude, lng: a.longitude, type: "poi" as const, kind: a.kind, summary: a.summary, imageUrl: a.cover?.url, url: `/attractions/${a.slug}` })),
    ...d.nearby.map((a) => ({ id: a.id, name: a.name, lat: a.latitude, lng: a.longitude, type: "poi" as const, kind: a.kind, summary: a.summary, imageUrl: a.cover?.url, url: `/attractions/${a.slug}`, muted: true })),
  ];

  const jsonLd = {
    "@context": "https://schema.org", "@type": "TouristDestination", name: d.name, description: d.summary,
    geo: { "@type": "GeoCoordinates", latitude: d.latitude, longitude: d.longitude },
    image: d.photos.map((p) => p.url),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        photo={d.photos[0]}
        crumbs={[{ href: "/", label: "Главная" }, { href: "/destinations", label: "Направления" }, { label: d.name }]}
        eyebrow={d.region.name}
        title={d.name}
        subtitle={d.tagline}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/tours?destination=${d.slug}`} className="btn-light">
            <Route size={16} /> Маршруты сюда
          </Link>
          <FavoriteButton destinationId={d.id} light />
        </div>
      </PageHero>

      <section className="container-x grid gap-14 py-16 md:py-24 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="font-display text-[26px] leading-snug text-forest sm:text-[30px]">{d.summary}</p>
          <RichText text={d.description} className="mt-10" />
        </div>
        <aside className="space-y-8 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          <div className="card divide-y divide-graphite/8">
            <div className="flex gap-3 p-5">
              <MapPin size={19} className="mt-0.5 shrink-0 text-turquoise" aria-hidden />
              <div>
                <p className="text-[12px] font-semibold tracking-wider text-stone uppercase">Расположение</p>
                <p className="mt-1 text-[15px]">{d.region.name}</p>
                <p className="text-[13px] text-stone">{d.latitude.toFixed(4)}° с. ш., {d.longitude.toFixed(4)}° в. д.</p>
              </div>
            </div>
            {d.bestTime && (
              <div className="flex gap-3 p-5">
                <CalendarDays size={19} className="mt-0.5 shrink-0 text-turquoise" aria-hidden />
                <div>
                  <p className="text-[12px] font-semibold tracking-wider text-stone uppercase">Лучшее время</p>
                  <p className="mt-1 text-[15px]">{d.bestTime}</p>
                </div>
              </div>
            )}
            {d.categories.length > 0 && (
              <div className="p-5">
                <p className="mb-3 text-[12px] font-semibold tracking-wider text-stone uppercase">Категории</p>
                <div className="flex flex-wrap gap-2">
                  {d.categories.map((c) => (
                    <Link key={c.slug} href={`/categories/${c.slug}`} className="chip hover:border-forest hover:text-forest">
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {d.highlights.length > 0 && (
            <div>
              <p className="eyebrow mb-4 text-turquoise">Особенности</p>
              <ul className="space-y-3">
                {d.highlights.map((h) => (
                  <li key={h} className="flex gap-3 border-b border-graphite/8 pb-3 text-[15px]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-turquoise" aria-hidden /> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>

      {d.photos.length > 1 && (
        <section className="container-x pb-20">
          <h2 className="h-display mb-8 text-[32px] text-forest sm:text-[40px]">Галерея</h2>
          <Gallery photos={d.photos} title={d.name} />
        </section>
      )}

      {d.attractions.length > 0 && (
        <section className="container-x pb-20">
          <SectionHeader eyebrow="Что посмотреть" title={`Достопримечательности: ${d.name}`} />
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {d.attractions.map((p) => (
              <PoiCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      <section className="bg-sand py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow mb-3 text-turquoise">На карте</p>
            <h2 className="h-display text-[32px] text-forest sm:text-[42px]">Интересные места поблизости</h2>
            <ul className="mt-8 space-y-3">
              {d.nearby.map((n) => (
                <li key={n.id}>
                  <Link href={`/attractions/${n.slug}`} className="flex items-baseline justify-between gap-4 border-b border-forest/10 pb-3 hover:text-turquoise">
                    <span className="font-semibold">{n.name}</span>
                    <span className="text-[13px] text-stone">{n.region}</span>
                  </Link>
                </li>
              ))}
              {d.nearby.length === 0 && <li className="text-stone">Других мест поблизости в каталоге пока нет.</li>}
            </ul>
          </div>
          <div className="h-[420px] overflow-hidden rounded-sm border border-forest/10">
            <PlaceMap markers={markers} />
          </div>
        </div>
      </section>

      {d.tours.length > 0 && (
        <section className="container-x py-20">
          <SectionHeader eyebrow="Связанные маршруты" title="Туры через это направление" href={`/tours?destination=${d.slug}`} linkLabel="Все маршруты" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {d.tours.map((t) => (
              <TourCard key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      {d.articles.length > 0 && (
        <section className="container-x pb-24">
          <SectionHeader eyebrow="Журнал" title="Почитать перед поездкой" />
          <div className="grid gap-10 md:grid-cols-3">
            {d.articles.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
