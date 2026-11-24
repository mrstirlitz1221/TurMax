import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { apiGetRequired } from "@/lib/api-server";
import type { Category } from "@/lib/types";
import { Breadcrumbs } from "@/components/ui";
import { plural } from "@/lib/format";

export const metadata: Metadata = {
  title: "Категории путешествий",
  description: "Горный туризм, трекинг, культурный и экологический туризм, приключения, семейный отдых и исторические места Кыргызстана.",
};

export default async function CategoriesPage() {
  const categories = await apiGetRequired<Category[]>("/categories");
  return (
    <section className="bg-forest-deep pt-[calc(var(--header-h)+40px)] pb-24 text-white">
      <div className="container-x">
        <Breadcrumbs light items={[{ href: "/", label: "Главная" }, { label: "Впечатления" }]} />
        <p className="eyebrow mt-8 text-sky">Категории путешествий</p>
        <h1 className="h-display mt-3 max-w-4xl text-[42px] sm:text-[64px]">Выберите, каким будет ваше путешествие</h1>
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {categories.map((c, i) => (
            <Link key={c.id} href={`/categories/${c.slug}`} className={`group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-sm p-7 ${i === 0 ? "md:col-span-2 md:min-h-[460px]" : ""}`}>
              {c.imageUrl && <Image src={c.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 60vw" className="object-cover transition duration-[1.2s] group-hover:scale-105" priority={i < 2} />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="relative max-w-xl">
                <p className="text-[13px] text-white/70">
                  {c.toursCount > 0 && `${c.toursCount} ${plural(c.toursCount, "маршрут", "маршрута", "маршрутов")} · `}
                  {c.destinationsCount} {plural(c.destinationsCount, "направление", "направления", "направлений")}
                </p>
                <h2 className={`mt-1 font-display ${i === 0 ? "text-5xl md:text-6xl" : "text-4xl"}`}>{c.name}</h2>
                <p className="mt-3 text-[15.5px] leading-relaxed text-white/80">{c.description}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold">
                  Смотреть <ArrowUpRight size={16} className="transition group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
