import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CalendarDays, Car, Mountain, Ticket, BedDouble } from "lucide-react";
import { apiGet } from "@/lib/api-server";
import type { Poi } from "@/lib/types";
import { PageHero } from "@/components/PageHero";
import { Gallery } from "@/components/Gallery";
import { RichText } from "@/components/RichText";
import { DestinationCard, PoiCard, TourCard } from "@/components/cards";
import { DemoNote, SectionHeader } from "@/components/ui";
import { PlaceMap } from "@/components/map/PlaceMap";
import { POI_KIND, ROAD } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import { UntranslatedNote } from "@/components/UntranslatedNote";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { L } = await getI18n();
  const p = await apiGet<Poi>(`/poi/${(await params).slug}`);
  if (!p) return { title: L("Место не найдено") };
  return { title: p.name, description: p.summary, openGraph: { title: p.name, description: p.summary, images: p.photos[0] ? [p.photos[0].url] : [] } };
}

export default async function AttractionPage({ params }: P) {
  const { L, som } = await getI18n();
  const p = await apiGet<Poi>(`/poi/${(await params).slug}`);
  if (!p) notFound();

  const facts = [
    { icon: Mountain, label: L("Высота"), value: p.altitudeM ? L("{n} м над уровнем моря", { n: p.altitudeM }) : null },
    { icon: Car, label: L("Дорога"), value: L(ROAD[p.roadType]) },
    { icon: CalendarDays, label: L("Сезон"), value: p.season },
    { icon: Ticket, label: L("Вход / сбор"), value: p.entryFee ? L("{price} с человека*", { price: som(p.entryFee) }) : null },
    { icon: BedDouble, label: L("Ночёвка"), value: p.lodgingPrice ? L("от {price} за ночь*", { price: som(p.lodgingPrice) }) : null },
  ].filter((f) => f.value);

  const crumbs = [{ href: "/", label: L("Главная") }, ...(p.destination ? [{ href: `/destinations/${p.destination.slug}`, label: p.destination.name }] : [{ href: "/map", label: L("Карта") }]), { label: p.name }];

  return (
    <>
      <PageHero photo={p.photos[0]} tall={false} crumbs={crumbs} eyebrow={`${L(POI_KIND[p.kind])} · ${p.region.name}`} title={p.name} subtitle={p.summary} />

      <section className="container-x grid gap-14 py-16 md:py-20 lg:grid-cols-[1fr_360px]">
        <div>
          {p.needsPermit && (
            <div className="mb-8 flex gap-3 rounded-sm border border-[#e7c98d] bg-[#fbf1dc] p-4 text-[15px] text-[#6e4a0e]">
              <AlertTriangle size={20} className="shrink-0" aria-hidden />
              {L("Место находится в пограничной зоне — для посещения нужен пропуск, который оформляется заранее.")}
            </div>
          )}
          <UntranslatedNote show={p.untranslated} />
          <RichText text={p.description || p.summary} />
          {p.photos.length > 1 && (
            <div className="mt-12">
              <Gallery photos={p.photos} title={p.name} />
            </div>
          )}
        </div>
        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          <dl className="card divide-y divide-graphite/8">
            {facts.map((f) => (
              <div key={f.label} className="flex gap-3 p-4">
                <f.icon size={18} className="mt-0.5 shrink-0 text-turquoise" aria-hidden />
                <div>
                  <dt className="text-[12px] font-semibold tracking-wider text-stone uppercase">{f.label}</dt>
                  <dd className="mt-0.5 text-[15px]">{f.value}</dd>
                </div>
              </div>
            ))}
          </dl>
          {(p.entryFee || p.lodgingPrice) && <DemoNote />}
          <div className="h-[280px] overflow-hidden rounded-sm border border-graphite/10">
            <PlaceMap markers={[{ id: p.id, name: p.name, lat: p.latitude, lng: p.longitude, type: "poi", kind: p.kind, summary: p.summary }]} />
          </div>
          <Link href={`/planner?add=${p.id}`} className="btn-primary w-full">
            {L("Добавить в свой маршрут")}
          </Link>
        </aside>
      </section>

      {p.tours.length > 0 && (
        <section className="container-x pb-20">
          <SectionHeader eyebrow={L("Связанные маршруты")} title={L("Туры, которые сюда заезжают")} />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {p.tours.map((t) => <TourCard key={t.id} t={t} />)}
          </div>
        </section>
      )}

      <section className="bg-sand py-20">
        <div className="container-x grid gap-12 lg:grid-cols-[360px_1fr]">
          {p.destination && (
            <div>
              <p className="eyebrow mb-4 text-turquoise">{L("Направление")}</p>
              <DestinationCard d={p.destination} />
            </div>
          )}
          <div>
            <p className="eyebrow mb-4 text-turquoise">{L("Рядом")}</p>
            {p.nearby.length > 0 ? (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {p.nearby.slice(0, 6).map((n) => <PoiCard key={n.id} p={n} />)}
              </div>
            ) : (
              <p className="text-stone">{L("Других мест в радиусе 80 км в каталоге пока нет.")}</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
