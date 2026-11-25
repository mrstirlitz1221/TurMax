import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { apiGetRequired } from "@/lib/api-server";
import type { Category } from "@/lib/types";
import { Breadcrumbs } from "@/components/ui";
import { Reveal, SplitTitle } from "@/components/Reveal";
import { ParallaxImage } from "@/components/parallax";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return {
    title: L("Категории путешествий"),
    description: L("Горный туризм, трекинг, культурный и экологический туризм, приключения, семейный отдых и исторические места Кыргызстана."),
  };
}

export default async function CategoriesPage() {
  const { L, Lp } = await getI18n();
  const categories = await apiGetRequired<Category[]>("/categories");
  return (
    <section className="bg-forest-deep pt-[calc(var(--header-h)+40px)] pb-24 text-white">
      <div className="container-x">
        <Breadcrumbs light items={[{ href: "/", label: L("Главная") }, { label: L("Впечатления") }]} />
        <p className="eyebrow mt-8 text-sky">{L("Категории путешествий")}</p>
        <SplitTitle as="h1" text={L("Выберите, каким будет ваше путешествие")} className="h-display mt-3 max-w-4xl text-[42px] sm:text-[64px]" />
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {categories.map((c, i) => (
            <Reveal key={c.id} variant="clip" delay={(i % 2) * 140} className={i === 0 ? "md:col-span-2" : ""}>
            <Link href={`/categories/${c.slug}`} className={`group card-lift relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-sm p-7 ${i === 0 ? "md:min-h-[460px]" : ""}`}>
              <ParallaxImage photo={c.imageUrl ? { url: c.imageUrl, alt: "" } : null} alt="" strength={12} sizes="(max-width: 768px) 100vw, 60vw" priority={i < 2} className="zoom-img !absolute inset-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="relative max-w-xl">
                <p className="text-[13px] text-white/70">
                  {c.toursCount > 0 && `${Lp(c.toursCount, "маршрут", "маршрута", "маршрутов")} · `}
                  {Lp(c.destinationsCount, "направление", "направления", "направлений")}
                </p>
                <h2 className={`mt-1 font-display ${i === 0 ? "text-5xl md:text-6xl" : "text-4xl"}`}>{c.name}</h2>
                <p className="mt-3 text-[15.5px] leading-relaxed text-white/80">{c.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold">
                  {L("Смотреть")} <ArrowUpRight size={16} className="transition group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
              </div>
            </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
