import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Calculator, Map as MapIcon, Route, Send } from "lucide-react";
import { apiGetRequired } from "@/lib/api-server";
import type { ArticleCard as A, Category, DestinationCard as D, MapPoint, Paged, PoiCard as P, TourCard as T } from "@/lib/types";
import { ArticleCard, DestinationCard, PoiCard, Rail, TourCard } from "@/components/cards";
import { Img, PhotoCredit, SectionHeader } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { HeroSearch } from "@/components/home/HeroSearch";
import { HomeMap } from "@/components/home/HomeMap";
import { plural } from "@/lib/format";

export const revalidate = 60;

export default async function HomePage() {
  const [destinations, categories, tours, articles, points, pois] = await Promise.all([
    apiGetRequired<D[]>("/destinations"),
    apiGetRequired<Category[]>("/categories"),
    apiGetRequired<Paged<T>>("/tours?sort=rating&pageSize=6"),
    apiGetRequired<Paged<A>>("/articles?pageSize=3"),
    apiGetRequired<MapPoint[]>("/map/points"),
    apiGetRequired<P[]>("/poi"),
  ]);

  const hero = destinations.find((d) => d.slug === "song-kol") ?? destinations[0];
  const featured = destinations.slice(0, 5);
  const placesPick = ["kanon-skazka", "karavan-saray-tash-rabat", "dunganskaya-mechet", "bashnya-burana", "sulayman-too", "altyn-arashan", "ozero-sary-chelek", "han-tengri"];
  const places = placesPick.map((s) => pois.find((p) => p.slug === s)).filter(Boolean).slice(0, 4) as P[];
  const mosaic = [destinations.find((d) => d.slug === "jeti-oguz"), destinations.find((d) => d.slug === "kel-suu"), destinations.find((d) => d.slug === "arslanbob"),
    destinations.find((d) => d.slug === "tash-rabat"), destinations.find((d) => d.slug === "ala-kul")].filter(Boolean) as D[];

  return (
    <>
      {/* ---------- Первый экран ---------- */}
      <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-forest-deep text-white">
        <div className="slow-zoom absolute inset-0">
          {hero?.cover && <Image src={hero.cover.url} alt={hero.cover.alt} fill priority sizes="100vw" className="object-cover" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />
        <div className="container-x relative pb-16 sm:pb-24">
          <p className="hero-in eyebrow mb-6 text-sky">Туристический портал Кыргызстана</p>
          <h1 className="hero-in-2 h-display max-w-5xl text-[40px] min-[400px]:text-[48px] sm:text-[84px] lg:text-[112px]">
            Открой Кыргызстан.
            <br />
            <em className="font-normal text-sand">Найди своё путешествие.</em>
          </h1>
          <p className="hero-in-3 mt-7 max-w-xl text-[17px] leading-relaxed text-white/85 sm:text-lg">
            Высокогорные озёра, кочевые пастбища и города Шёлкового пути. Выберите готовый маршрут или соберите свой — и сразу
            узнайте ориентировочную стоимость.
          </p>
          <div className="hero-in-3 mt-9 flex flex-col gap-5 lg:flex-row lg:items-center">
            <Link href="#explore" className="btn-light !px-7 !py-4 text-[15px]">
              Исследовать Кыргызстан <ArrowRight size={17} />
            </Link>
            <HeroSearch />
          </div>
        </div>
        <PhotoCredit photo={hero?.cover} className="absolute right-4 bottom-3 hidden text-white sm:block" />
      </section>

      {/* ---------- Введение ---------- */}
      <section id="explore" className="container-x scroll-mt-24 py-20 md:py-28">
        <Reveal className="grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-end">
          <h2 className="h-display text-[34px] text-forest sm:text-[48px] lg:text-[56px]">
            Страна, где почти вся территория — горы, а дорога к озеру идёт через перевал.
          </h2>
          <div className="space-y-6">
            <p className="text-[17px] leading-relaxed text-stone">
              TurMax собирает направления, достопримечательности и маршруты местных операторов в одном месте. Смотрите места на
              карте, сравнивайте туры по длительности, сложности и сезону и отправляйте заявку без переписки в мессенджерах.
            </p>
            <dl className="grid grid-cols-3 border-t border-forest/15 pt-6">
              {[
                [destinations.length, "направлений"],
                [pois.length, "мест на карте"],
                [tours.total, "маршрутов"],
              ].map(([n, l]) => (
                <div key={l as string} className="flex flex-col-reverse">
                  <dt className="mt-1 text-[13px] text-stone">{l}</dt>
                  <dd className="font-display text-4xl text-forest">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </section>

      {/* ---------- Популярные направления ---------- */}
      <section className="container-x pb-24 md:pb-32">
        <SectionHeader eyebrow="Популярные направления" title="Куда поехать в первую очередь" href="/destinations" linkLabel="Все направления" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12">
          {featured[0] && (
            <Reveal className="md:col-span-2 lg:col-span-6 lg:row-span-2">
              <DestinationCard d={featured[0]} size="lg" priority />
            </Reveal>
          )}
          {featured.slice(1, 5).map((d, i) => (
            <Reveal key={d.id} className="lg:col-span-3" delay={i * 80}>
              <DestinationCard d={d} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Категории ---------- */}
      <section className="bg-forest py-24 text-white md:py-32">
        <div className="container-x">
          <SectionHeader light eyebrow="Категории путешествий" title="Как вы хотите путешествовать?" href="/categories" linkLabel="Все категории" />
          <div className="grid gap-px overflow-hidden rounded-sm bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 7).map((c, i) => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className={`group relative flex min-h-[260px] flex-col justify-end overflow-hidden bg-forest p-6 ${i === 0 ? "lg:col-span-2 lg:row-span-2 lg:min-h-[540px]" : ""}`}
              >
                {c.imageUrl && (
                  <Image src={c.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover opacity-55 transition duration-[1.2s] group-hover:scale-105 group-hover:opacity-70" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/90 via-forest-deep/20 to-transparent" />
                <div className="relative">
                  <p className="text-[12.5px] text-white/65">
                    {c.toursCount > 0 && `${c.toursCount} ${plural(c.toursCount, "маршрут", "маршрута", "маршрутов")} · `}
                    {c.destinationsCount} {plural(c.destinationsCount, "направление", "направления", "направлений")}
                  </p>
                  <h3 className={`mt-1 font-display ${i === 0 ? "text-4xl md:text-5xl" : "text-[28px]"}`}>{c.name}</h3>
                  <p className="mt-2 max-w-sm text-[14px] text-white/75">{c.tagline}</p>
                  <ArrowUpRight className="mt-4 transition group-hover:translate-x-1 group-hover:-translate-y-1" size={20} />
                </div>
              </Link>
            ))}
            <Link href="/tours" className="group flex min-h-[260px] flex-col justify-between bg-turquoise p-6 transition hover:bg-turquoise-light">
              <p className="eyebrow text-white/80">Каталог</p>
              <div>
                <p className="font-display text-[28px]">Все маршруты и туры</p>
                <p className="mt-2 text-[14px] text-white/85">Фильтры по региону, сезону, сложности, бюджету и языку гида</p>
                <ArrowRight className="mt-4 transition group-hover:translate-x-1" size={20} />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Рекомендуемые маршруты ---------- */}
      <section className="container-x py-24 md:py-32">
        <SectionHeader eyebrow="Рекомендуемые маршруты" title="Готовые маршруты местных операторов" text="Программа по дням, карта, сложность и ближайшие выезды — всё, чтобы сравнить предложения и выбрать своё." href="/tours" linkLabel="Каталог маршрутов" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tours.items.slice(0, 6).map((t, i) => (
            <Reveal key={t.id} delay={(i % 3) * 80}>
              <TourCard t={t} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Карта ---------- */}
      <section className="bg-sand py-24 md:py-32">
        <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.6fr] lg:items-center">
          <div>
            <p className="eyebrow mb-3 text-turquoise">Интерактивная карта</p>
            <h2 className="h-display text-[34px] text-forest sm:text-[48px]">Вся страна на одной карте</h2>
            <p className="mt-5 text-[16.5px] leading-relaxed text-stone">
              {points.length} точек: направления, озёра, перевалы, памятники истории и горячие источники. Нажмите на маркер, чтобы
              увидеть описание и перейти на страницу места.
            </p>
            <Link href="/map" className="btn-primary mt-8">
              <MapIcon size={17} /> Открыть карту
            </Link>
          </div>
          <div className="h-[420px] overflow-hidden rounded-sm border border-forest/10 shadow-xl md:h-[540px]">
            <HomeMap points={points} />
          </div>
        </div>
      </section>

      {/* ---------- Интересные места ---------- */}
      <section className="container-x py-24 md:py-32">
        <SectionHeader eyebrow="Интересные места" title="То, ради чего стоит свернуть с трассы" href="/map" linkLabel="Все места на карте" />
        <Rail>
          {places.map((p) => (
            <PoiCard key={p.id} p={p} />
          ))}
        </Rail>
      </section>

      {/* ---------- Журнал ---------- */}
      <section className="border-t border-forest/10 bg-white py-24 md:py-32">
        <div className="container-x">
          <SectionHeader eyebrow="Журнал TurMax" title="Истории и советы для поездки" href="/journal" linkLabel="Все статьи" />
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
            {articles.items[0] && <ArticleCard a={articles.items[0]} large />}
            <div className="grid gap-12">
              {articles.items.slice(1, 3).map((a) => (
                <ArticleCard key={a.id} a={a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Вдохновение ---------- */}
      <section className="bg-forest-deep py-24 text-white md:py-32">
        <div className="container-x">
          <SectionHeader light eyebrow="Вдохновение" title="Кыргызстан в кадре" text="Фотографии путешественников из Wikimedia Commons — нажмите, чтобы открыть направление." />
          <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4">
            {mosaic.map((d, i) => (
              <Link
                key={d.id}
                href={`/destinations/${d.slug}`}
                className={`group relative overflow-hidden rounded-sm ${i === 0 ? "col-span-2 row-span-2" : i === 3 ? "col-span-2" : ""}`}
              >
                <div className="zoom-img absolute inset-0">
                  <Img photo={d.cover} alt={d.name} fill sizes="(max-width: 768px) 50vw, 30vw" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80 transition group-hover:opacity-100" />
                <span className="absolute bottom-3 left-4 font-display text-xl">{d.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Призыв к планированию ---------- */}
      <section className="container-x py-24 md:py-32">
        <div className="grid overflow-hidden rounded-sm bg-white lg:grid-cols-2">
          <div className="relative min-h-[320px]">
            <Img photo={destinations.find((d) => d.slug === "ala-kul")?.cover} alt="Озеро Ала-Куль" fill sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
          <div className="p-8 sm:p-12 lg:p-16">
            <p className="eyebrow mb-3 text-turquoise">Конструктор маршрута</p>
            <h2 className="h-display text-[34px] text-forest sm:text-[46px]">Спланируйте поездку за несколько минут</h2>
            <ol className="mt-8 space-y-5">
              {[
                [Route, "Выберите точки на карте и распределите их по дням"],
                [Calculator, "Получите смету: транспорт, проживание, питание, гид и сборы"],
                [Send, "Отправьте заявку оператору и следите за статусом в кабинете"],
              ].map(([Icon, text], i) => {
                const I = Icon as typeof Route;
                return (
                  <li key={i} className="flex gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand-light text-forest">
                      <I size={18} />
                    </span>
                    <span className="pt-2 text-[16px] text-graphite">{text as string}</span>
                  </li>
                );
              })}
            </ol>
            <Link href="/planner" className="btn-accent mt-10 !px-7 !py-4">
              Собрать свой маршрут <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
