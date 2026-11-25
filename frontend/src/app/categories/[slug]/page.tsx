import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, apiGetRequired } from "@/lib/api-server";
import type { Category, DestinationCard as D, Paged, TourCard as T } from "@/lib/types";
import { PageHero } from "@/components/PageHero";
import { DestinationCard, TourCard } from "@/components/cards";
import { EmptyState, SectionHeader } from "@/components/ui";
import { getI18n } from "@/i18n/server";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { L } = await getI18n();
  const c = await apiGet<Category>(`/categories/${(await params).slug}`);
  return c ? { title: c.name, description: c.description } : { title: L("Категория не найдена") };
}

export default async function CategoryPage({ params }: P) {
  const { L } = await getI18n();
  const { slug } = await params;
  const c = await apiGet<Category>(`/categories/${slug}`);
  if (!c) notFound();
  const [destinations, tours, all] = await Promise.all([
    apiGetRequired<D[]>(`/destinations?category=${slug}`),
    apiGetRequired<Paged<T>>(`/tours?category=${slug}&pageSize=12&sort=rating`),
    apiGetRequired<Category[]>("/categories"),
  ]);

  return (
    <>
      <PageHero
        tall={false}
        ridge="#ffffff"
        photo={c.imageUrl ? { url: c.imageUrl, alt: c.name, author: c.imageCredit } : null}
        crumbs={[{ href: "/", label: L("Главная") }, { href: "/categories", label: L("Впечатления") }, { label: c.name }]}
        eyebrow={L("Категория путешествий")}
        title={c.name}
        subtitle={c.description}
      />
      <nav aria-label={L("Другие категории")} className="border-b border-graphite/8 bg-white">
        <div className="container-x no-scrollbar flex gap-6 overflow-x-auto py-4 text-[14px]">
          {all.map((x) => (
            <Link key={x.slug} href={`/categories/${x.slug}`} aria-current={x.slug === slug ? "page" : undefined} className={`shrink-0 ${x.slug === slug ? "font-bold text-forest underline underline-offset-8" : "text-stone hover:text-forest"}`}>
              {x.name}
            </Link>
          ))}
        </div>
      </nav>

      <section className="container-x py-20">
        <SectionHeader eyebrow={L("Направления")} title={L("Куда поехать: {name}", { name: c.name.toLowerCase() })} href={`/destinations?category=${slug}`} linkLabel={L("Все в каталоге")} />
        {destinations.length === 0 ? (
          <EmptyState title={L("Направлений пока нет")} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {destinations.map((d) => <DestinationCard key={d.id} d={d} />)}
          </div>
        )}
      </section>

      <section className="bg-sand py-20">
        <div className="container-x">
          <SectionHeader eyebrow={L("Маршруты")} title={L("Готовые туры в этой категории")} href={`/tours?category=${slug}`} linkLabel={L("Открыть в каталоге")} />
          {tours.items.length === 0 ? (
            <EmptyState
              title={L("Туров в этой категории пока нет")}
              text={L("Операторы ещё не добавили маршруты. Соберите поездку сами в конструкторе.")}
              action={<Link href="/planner" className="btn-primary">{L("Открыть конструктор")}</Link>}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tours.items.map((t) => <TourCard key={t.id} t={t} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
