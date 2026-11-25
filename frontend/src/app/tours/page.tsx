import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { List, Map as MapIcon } from "lucide-react";
import { apiGetRequired } from "@/lib/api-server";
import type { Category, Paged, Region, TourCard as T } from "@/lib/types";
import { TourCard } from "@/components/cards";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { DemoNote, EmptyState } from "@/components/ui";
import { SortSelect, TourFilters } from "@/components/tours/TourFilters";
import { ToursMap } from "@/components/tours/ToursMap";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return {
    title: L("Маршруты и туры"),
    description: L("Каталог туристических маршрутов по Кыргызстану с фильтрами по региону, длительности, сложности, сезону, бюджету и языку гида."),
  };
}

type SP = Promise<Record<string, string | undefined>>;
const KEYS = ["q", "region", "category", "daysMin", "daysMax", "difficulty", "month", "priceMax", "lang", "destination", "sort", "page"];

export default async function ToursPage({ searchParams }: { searchParams: SP }) {
  const { L, Lp } = await getI18n();
  const sp = await searchParams;
  const qs = new URLSearchParams();
  KEYS.forEach((k) => sp[k] && qs.set(k, sp[k]!));
  const view = sp.view === "map" ? "map" : "list";
  qs.set("pageSize", view === "map" ? "48" : "12");

  const [data, regions, categories] = await Promise.all([
    apiGetRequired<Paged<T>>(`/tours?${qs}`, 30),
    apiGetRequired<Region[]>("/regions"),
    apiGetRequired<Category[]>("/categories"),
  ]);
  const pages = Math.ceil(data.total / data.pageSize);
  const heroCat = categories.find((c) => c.slug === (sp.category ?? "trekking")) ?? categories.find((c) => c.slug === "trekking");

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ ...sp, ...patch }).forEach(([k, v]) => v && p.set(k, v));
    return `/tours?${p}`;
  };

  return (
    <>
      <PageHero
        tall={false}
        photo={heroCat?.imageUrl ? { url: heroCat.imageUrl, alt: heroCat.name, author: heroCat.imageCredit } : null}
        crumbs={[{ href: "/", label: L("Главная") }, { label: L("Маршруты") }]}
        eyebrow={L("Маршруты и туры")}
        title={L("Готовые маршруты по Кыргызстану")}
        subtitle={L("Сравнивайте предложения операторов по единым критериям: длительность, сложность, сезон, высота и цена. Нашли подходящий — отправьте заявку на выезд.")}
      />
      <section className="container-x grid gap-10 pt-12 pb-28 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          <Suspense>
            <TourFilters regions={regions} categories={categories} />
          </Suspense>
        </aside>
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[14px] text-stone" aria-live="polite">
              {Lp(data.total, "маршрут", "маршрута", "маршрутов")}
              {sp.destination && <> {L("· направление:")} <b>{sp.destination}</b> <Link href={href({ destination: undefined })} className="underline">{L("сбросить")}</Link></>}
            </p>
            <div className="flex items-center gap-4">
              <Suspense>
                <SortSelect />
              </Suspense>
              <div className="flex rounded-sm border border-graphite/15 bg-white p-0.5" role="group" aria-label={L("Вид")}>
                <Link href={href({ view: undefined, page: undefined })} aria-current={view === "list"} className={`flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-[13px] ${view === "list" ? "bg-forest text-white" : "text-stone"}`}>
                  <List size={15} /> {L("Список")}
                </Link>
                <Link href={href({ view: "map", page: undefined })} aria-current={view === "map"} className={`flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-[13px] ${view === "map" ? "bg-forest text-white" : "text-stone"}`}>
                  <MapIcon size={15} /> {L("Карта")}
                </Link>
              </div>
            </div>
          </div>

          {data.items.length === 0 ? (
            <EmptyState title={L("Подходящих маршрутов нет")} text={L("Измените фильтры или соберите собственный маршрут в конструкторе.")} action={<Link href="/planner" className="btn-primary">{L("Открыть конструктор")}</Link>} />
          ) : view === "map" ? (
            <div className="h-[70vh] min-h-[420px] overflow-hidden rounded-sm border border-graphite/10">
              <ToursMap tours={data.items} />
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((t, i) => (
                  <Reveal key={t.id} variant="clip" delay={(i % 3) * 130}>
                    <TourCard t={t} priority={i < 3} />
                  </Reveal>
                ))}
              </div>
              {pages > 1 && (
                <nav aria-label={L("Страницы")} className="mt-12 flex justify-center gap-1.5">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                    <Link key={n} href={href({ page: String(n) })} aria-current={data.page === n ? "page" : undefined} className={`grid h-10 w-10 place-items-center rounded-sm text-sm ${data.page === n ? "bg-forest text-white" : "bg-white hover:bg-sand"}`}>
                      {n}
                    </Link>
                  ))}
                </nav>
              )}
            </>
          )}
          <DemoNote className="mt-10" />
        </div>
      </section>
    </>
  );
}
