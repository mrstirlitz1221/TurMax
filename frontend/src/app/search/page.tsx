import type { Metadata } from "next";
import Link from "next/link";
import { apiGetRequired } from "@/lib/api-server";
import type { SearchResult } from "@/lib/types";
import { ArticleCard, DestinationCard, PoiCard, TourCard } from "@/components/cards";
import { PageIntro } from "@/components/PageHero";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Поиск", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const r: SearchResult = q.length >= 2 ? await apiGetRequired<SearchResult>(`/search?q=${encodeURIComponent(q)}`, 30) : { destinations: [], attractions: [], tours: [], articles: [] };
  const total = r.destinations.length + r.attractions.length + r.tours.length + r.articles.length;

  return (
    <>
      <PageIntro crumbs={[{ href: "/", label: "Главная" }, { label: "Поиск" }]} eyebrow="Поиск" title={q ? `«${q}»` : "Что вы ищете?"}>
        <form action="/search" className="flex max-w-xl gap-2" role="search">
          <input name="q" defaultValue={q} minLength={2} required placeholder="Озеро, город, маршрут…" aria-label="Поисковый запрос" className="field" />
          <button className="btn-primary">Найти</button>
        </form>
        {q && <p className="mt-4 text-[14px] text-stone" aria-live="polite">Найдено результатов: {total}</p>}
      </PageIntro>
      <div className="container-x space-y-20 pb-28">
        {q.length >= 2 && total === 0 && (
          <EmptyState title="Ничего не нашлось" text="Проверьте написание или посмотрите все направления." action={<Link href="/destinations" className="btn-outline">Все направления</Link>} />
        )}
        {r.destinations.length > 0 && (
          <section>
            <h2 className="h-display mb-8 text-3xl text-forest">Направления</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{r.destinations.map((d) => <DestinationCard key={d.id} d={d} />)}</div>
          </section>
        )}
        {r.tours.length > 0 && (
          <section>
            <h2 className="h-display mb-8 text-3xl text-forest">Маршруты</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{r.tours.map((t) => <TourCard key={t.id} t={t} />)}</div>
          </section>
        )}
        {r.attractions.length > 0 && (
          <section>
            <h2 className="h-display mb-8 text-3xl text-forest">Места</h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{r.attractions.map((p) => <PoiCard key={p.id} p={p} />)}</div>
          </section>
        )}
        {r.articles.length > 0 && (
          <section>
            <h2 className="h-display mb-8 text-3xl text-forest">Статьи</h2>
            <div className="grid gap-10 md:grid-cols-3">{r.articles.map((a) => <ArticleCard key={a.id} a={a} />)}</div>
          </section>
        )}
      </div>
    </>
  );
}
