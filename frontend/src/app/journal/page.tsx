import type { Metadata } from "next";
import Link from "next/link";
import { apiGetRequired } from "@/lib/api-server";
import type { ArticleCard as A, Paged } from "@/lib/types";
import { ArticleCard } from "@/components/cards";
import { PageIntro } from "@/components/PageHero";
import { EmptyState } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return {
    title: L("Журнал"),
    description: L("Статьи о путешествиях по Кыргызстану: что посмотреть, куда поехать летом, озёра, национальная кухня, традиции и советы."),
  };
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { L } = await getI18n();
  const { topic } = await searchParams;
  const [data, topics] = await Promise.all([
    apiGetRequired<Paged<A>>(`/articles?pageSize=24${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`),
    apiGetRequired<{ value: string; label: string }[]>("/articles/topics"),
  ]);
  const [lead, ...rest] = data.items;

  return (
    <>
      <PageIntro crumbs={[{ href: "/", label: L("Главная") }, { label: L("Журнал") }]} eyebrow={L("Журнал TurMax")} title={L("Истории, идеи и советы для поездки")}>
        <div className="flex flex-wrap gap-2">
          <Link href="/journal" className={`rounded-xs border px-3.5 py-2 text-[13.5px] ${!topic ? "border-forest bg-forest text-white" : "border-graphite/15 bg-white"}`}>{L("Все темы")}</Link>
          {topics.map((t) => (
            <Link key={t.value} href={`/journal?topic=${encodeURIComponent(t.value)}`} className={`rounded-xs border px-3.5 py-2 text-[13.5px] ${topic === t.value ? "border-forest bg-forest text-white" : "border-graphite/15 bg-white"}`}>
              {t.label}
            </Link>
          ))}
        </div>
      </PageIntro>
      <section className="container-x pb-28">
        {!lead ? (
          <EmptyState title={L("Статей пока нет")} />
        ) : (
          <>
            <div className="grid gap-10 border-b border-graphite/10 pb-16 lg:grid-cols-[1.5fr_1fr]">
              <Reveal variant="clip"><ArticleCard a={lead} large /></Reveal>
              <div className="grid content-start gap-10">
                {rest.slice(0, 2).map((a, i) => <Reveal key={a.id} variant="clip" delay={180 + i * 150}><ArticleCard a={a} /></Reveal>)}
              </div>
            </div>
            <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {rest.slice(2).map((a, i) => (
                <Reveal key={a.id} variant="clip" delay={(i % 3) * 120}>
                  <ArticleCard a={a} />
                </Reveal>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
