import type { Metadata } from "next";
import Link from "next/link";
import { apiGetRequired } from "@/lib/api-server";
import type { Category, DestinationCard as D, Region } from "@/lib/types";
import { DestinationCard } from "@/components/cards";
import { PageHero } from "@/components/PageHero";
import { Parallax } from "@/components/parallax";
import { EmptyState } from "@/components/ui";
import { Reveal, SplitTitle } from "@/components/Reveal";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return {
    title: L("Направления"),
    description: L("Каталог туристических направлений Кыргызстана: Иссык-Куль, Каракол, Сон-Куль, Ош, Арсланбоб, Таш-Рабат и другие."),
  };
}

type SP = Promise<{ category?: string; region?: string }>;

export default async function DestinationsPage({ searchParams }: { searchParams: SP }) {
  const { L } = await getI18n();
  const { category, region } = await searchParams;
  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (region) qs.set("region", region);
  const [items, categories, regions] = await Promise.all([
    apiGetRequired<D[]>(`/destinations?${qs}`),
    apiGetRequired<Category[]>("/categories"),
    apiGetRequired<Region[]>("/regions"),
  ]);
  const usedRegions = regions; // список регионов из справочника
  const heroPhoto = (items.find((d) => d.slug === "song-kol") ?? items[0])?.cover ?? null;

  const link = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { category, region, ...patch };
    Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/destinations${s ? `?${s}` : ""}`;
  };
  const chip = (active: boolean) =>
    `rounded-xs border px-3.5 py-2 text-[13.5px] font-medium transition ${active ? "border-forest bg-forest text-white" : "border-graphite/15 bg-white text-graphite hover:border-forest"}`;

  return (
    <>
      <PageHero
        tall={false}
        photo={heroPhoto}
        crumbs={[{ href: "/", label: L("Главная") }, { label: L("Направления") }]}
        eyebrow={L("Направления")}
        title={L("Куда поехать в Кыргызстане")}
        subtitle={L("От курортных берегов Иссык-Куля до юрт на Сон-Куле и древнего Оша. Выберите тип путешествия или регион.")}
      />
      <div className="sticky top-[var(--header-h)] z-30 border-b border-graphite/8 bg-sand-light/92 py-4 backdrop-blur-md">
        <div className="container-x">
        <div className="flex flex-col gap-4">
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={L("Фильтр по категориям")}>
              <Link href={link({ category: undefined })} className={chip(!category)} aria-current={!category ? "true" : undefined}>
                {L("Все")}
              </Link>
              {categories.map((c) => (
                <Link key={c.slug} href={link({ category: c.slug })} className={`shrink-0 ${chip(category === c.slug)}`} aria-current={category === c.slug ? "true" : undefined}>
                  {c.name}
                </Link>
              ))}
            </div>
            <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 text-[13px] sm:mx-0 sm:flex-wrap sm:px-0" aria-label={L("Фильтр по регионам")}>
              <span className="shrink-0 py-1.5 text-stone">{L("Регион:")}</span>
              <Link href={link({ region: undefined })} className={`shrink-0 py-1.5 ${!region ? "font-bold text-forest underline underline-offset-4" : "text-stone hover:text-forest"}`}>
                {L("любой")}
              </Link>
              {usedRegions.map((r) => (
                <Link key={r.slug} href={link({ region: r.slug })} className={`shrink-0 py-1.5 ${region === r.slug ? "font-bold text-forest underline underline-offset-4" : "text-stone hover:text-forest"}`}>
                  {r.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="container-x pt-14 pb-32">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <SplitTitle text={category ? categories.find((c) => c.slug === category)?.name ?? L("Направления") : L("Все направления")} className="h-display text-[36px] text-forest sm:text-[48px]" />
          <p className="text-[14px] text-stone" aria-live="polite">{L("Найдено:")} {items.length}</p>
        </div>
        {items.length === 0 ? (
          <EmptyState title={L("Ничего не найдено")} text={L("Попробуйте выбрать другую категорию или регион.")} action={<Link href="/destinations" className="btn-outline">{L("Сбросить фильтры")}</Link>} />
        ) : (
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((d, i) => {
              const col = i % 3;
              return (
                // Средняя колонка сдвинута вниз и движется навстречу — сетка выглядит как разложенные снимки
                <Parallax key={d.id} speed={col === 1 ? -60 : 35} className={`px-lg-only ${col === 1 ? "lg:mt-24" : ""}`}>
                  <Reveal variant="clip" delay={col * 120}>
                    <DestinationCard d={d} size={col === 1 ? "tall" : "md"} priority={i < 3} />
                  </Reveal>
                </Parallax>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
