import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, apiGetRequired } from "@/lib/api-server";
import type { Category, DestinationCard as D, Paged, TourCard as T } from "@/lib/types";
import { PageHero } from "@/components/PageHero";
import { DestinationCard, TourCard } from "@/components/cards";
import { EmptyState, SectionHeader } from "@/components/ui";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await apiGet<Category>(`/categories/${(await params).slug}`);
  return c ? { title: c.name, description: c.description } : { title: "Категория не найдена" };
}

export default async function CategoryPage({ params }: P) {
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
        photo={c.imageUrl ? { url: c.imageUrl, alt: c.name, author: c.imageCredit } : null}
        crumbs={[{ href: "/", label: "Главная" }, { href: "/categories", label: "Впечатления" }, { label: c.name }]}
        eyebrow="Категория путешествий"
        title={c.name}
        subtitle={c.description}
      />
      <nav aria-label="Другие категории" className="border-b border-graphite/8 bg-white">
        <div className="container-x no-scrollbar flex gap-6 overflow-x-auto py-4 text-[14px]">
          {all.map((x) => (
            <Link key={x.slug} href={`/categories/${x.slug}`} aria-current={x.slug === slug ? "page" : undefined} className={`shrink-0 ${x.slug === slug ? "font-bold text-forest underline underline-offset-8" : "text-stone hover:text-forest"}`}>
              {x.name}
            </Link>
          ))}
        </div>
      </nav>

      <section className="container-x py-20">
        <SectionHeader eyebrow="Направления" title={`Куда поехать: ${c.name.toLowerCase()}`} href={`/destinations?category=${slug}`} linkLabel="Все в каталоге" />
        {destinations.length === 0 ? (
          <EmptyState title="Направлений пока нет" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {destinations.map((d) => <DestinationCard key={d.id} d={d} />)}
          </div>
        )}
      </section>

      <section className="bg-sand py-20">
        <div className="container-x">
          <SectionHeader eyebrow="Маршруты" title="Готовые туры в этой категории" href={`/tours?category=${slug}`} linkLabel="Открыть в каталоге" />
          {tours.items.length === 0 ? (
            <EmptyState
              title="Туров в этой категории пока нет"
              text="Операторы ещё не добавили маршруты. Соберите поездку сами в конструкторе."
              action={<Link href="/planner" className="btn-primary">Открыть конструктор</Link>}
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
