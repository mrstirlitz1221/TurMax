import type { Metadata } from "next";
import Link from "next/link";
import { apiGetRequired } from "@/lib/api-server";
import type { Category, DestinationCard as D, Region } from "@/lib/types";
import { DestinationCard } from "@/components/cards";
import { PageIntro } from "@/components/PageHero";
import { EmptyState } from "@/components/ui";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Направления",
  description: "Каталог туристических направлений Кыргызстана: Иссык-Куль, Каракол, Сон-Куль, Ош, Арсланбоб, Таш-Рабат и другие.",
};

type SP = Promise<{ category?: string; region?: string }>;

export default async function DestinationsPage({ searchParams }: { searchParams: SP }) {
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
      <PageIntro
        crumbs={[{ href: "/", label: "Главная" }, { label: "Направления" }]}
        eyebrow="Направления"
        title="Куда поехать в Кыргызстане"
        text="От курортных берегов Иссык-Куля до юрт на Сон-Куле и древнего Оша. Выберите тип путешествия или регион."
      >
        <div className="flex flex-col gap-4">
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Фильтр по категориям">
            <Link href={link({ category: undefined })} className={chip(!category)} aria-current={!category ? "true" : undefined}>
              Все
            </Link>
            {categories.map((c) => (
              <Link key={c.slug} href={link({ category: c.slug })} className={`shrink-0 ${chip(category === c.slug)}`} aria-current={category === c.slug ? "true" : undefined}>
                {c.name}
              </Link>
            ))}
          </div>
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 text-[13px] sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Фильтр по регионам">
            <span className="shrink-0 py-1.5 text-stone">Регион:</span>
            <Link href={link({ region: undefined })} className={`shrink-0 py-1.5 ${!region ? "font-bold text-forest underline underline-offset-4" : "text-stone hover:text-forest"}`}>
              любой
            </Link>
            {usedRegions.map((r) => (
              <Link key={r.slug} href={link({ region: r.slug })} className={`shrink-0 py-1.5 ${region === r.slug ? "font-bold text-forest underline underline-offset-4" : "text-stone hover:text-forest"}`}>
                {r.name}
              </Link>
            ))}
          </div>
        </div>
      </PageIntro>

      <section className="container-x pb-28">
        <p className="mb-6 text-[14px] text-stone" aria-live="polite">
          Найдено: {items.length}
        </p>
        {items.length === 0 ? (
          <EmptyState title="Ничего не найдено" text="Попробуйте выбрать другую категорию или регион." action={<Link href="/destinations" className="btn-outline">Сбросить фильтры</Link>} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((d, i) => (
              <Reveal key={d.id} delay={(i % 3) * 70}>
                <DestinationCard d={d} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
