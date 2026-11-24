import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import type { Article } from "@/lib/types";
import { PageHero } from "@/components/PageHero";
import { RichText } from "@/components/RichText";
import { ArticleCard, DestinationCard } from "@/components/cards";
import { Img, PhotoCredit } from "@/components/ui";
import { date } from "@/lib/format";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = await apiGet<Article>(`/articles/${(await params).slug}`);
  if (!a) return { title: "Статья не найдена" };
  return { title: a.title, description: a.lead, openGraph: { type: "article", title: a.title, description: a.lead, images: a.photos[0] ? [a.photos[0].url] : [] } };
}

export default async function ArticlePage({ params }: P) {
  const a = await apiGet<Article>(`/articles/${(await params).slug}`);
  if (!a) notFound();
  const sections = a.body.split(/\n{2,}/).map((b, i) => ({ b: b.trim(), i })).filter((x) => x.b.startsWith("## "));

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.lead, datePublished: a.publishedAt, author: { "@type": "Organization", name: a.authorName }, image: a.photos.map((p) => p.url) }) }} />
      <PageHero tall={false} photo={a.photos[0]} crumbs={[{ href: "/", label: "Главная" }, { href: "/journal", label: "Журнал" }, { label: a.topic }]} eyebrow={`${a.topic} · ${a.readingMinutes} мин чтения`} title={a.title} />
      <div className="container-x grid gap-14 py-16 lg:grid-cols-[220px_minmax(0,720px)_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+24px)] text-[13.5px]">
            <p className="text-stone">{a.authorName}</p>
            <p className="text-stone">{date(a.publishedAt)}</p>
            {sections.length > 0 && (
              <nav aria-label="Содержание" className="mt-8">
                <p className="eyebrow mb-3 text-turquoise">Содержание</p>
                <ul className="space-y-2">
                  {sections.map((s) => (
                    <li key={s.i}><a href={`#s-${s.i}`} className="text-graphite/80 hover:text-turquoise">{s.b.slice(3)}</a></li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </aside>
        <div>
          <p className="font-display text-[24px] leading-snug text-forest sm:text-[28px]">{a.lead}</p>
          <p className="mt-4 text-[13px] text-stone lg:hidden">{a.authorName} · {date(a.publishedAt)}</p>
          <RichText text={a.body} className="mt-10" />
          {a.photos[1] && (
            <figure className="my-12">
              <div className="relative aspect-[16/10] overflow-hidden rounded-sm">
                <Img photo={a.photos[1]} fill sizes="(max-width: 1024px) 100vw, 720px" />
              </div>
              <figcaption className="mt-2"><PhotoCredit photo={a.photos[1]} className="text-stone" /></figcaption>
            </figure>
          )}
        </div>
        {a.destination && (
          <aside>
            <p className="eyebrow mb-4 text-turquoise">Направление</p>
            <DestinationCard d={a.destination} />
          </aside>
        )}
      </div>
      {a.related.length > 0 && (
        <section className="border-t border-graphite/10 bg-white py-20">
          <div className="container-x">
            <h2 className="h-display mb-10 text-[34px] text-forest">Читайте также</h2>
            <div className="grid gap-10 md:grid-cols-3">
              {a.related.map((r) => <ArticleCard key={r.id} a={r} />)}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
