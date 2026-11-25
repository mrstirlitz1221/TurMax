import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calculator, Map as MapIcon, Route, Send } from "lucide-react";
import { apiGetRequired } from "@/lib/api-server";
import type { ArticleCard as A, Category, DestinationCard as D, MapPoint, Paged, PoiCard as P, TourCard as T } from "@/lib/types";
import { ArticleCard, DestinationCard, PoiCard, Rail, TourCard } from "@/components/cards";
import { PhotoCredit, SectionHeader } from "@/components/ui";
import { Reveal, Stagger } from "@/components/Reveal";
import { ExperienceSwitcher } from "@/components/home/ExperienceSwitcher";
import { HorizontalScroll } from "@/components/HorizontalScroll";
import { HeroSearch } from "@/components/home/HeroSearch";
import { HomeMap } from "@/components/home/HomeMap";
import { ExpandScene } from "@/components/home/ExpandScene";
import { ExitScene, Parallax, ParallaxImage } from "@/components/parallax";
import { Ridges } from "@/components/parallax/Ridges";
import { getI18n } from "@/i18n/server";

export const revalidate = 60;

export default async function HomePage() {
  const { L } = await getI18n();
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
  const expand = destinations.find((d) => d.slug === "ala-kul");
  const placesPick = ["kanon-skazka", "karavan-saray-tash-rabat", "dunganskaya-mechet", "bashnya-burana", "sulayman-too", "altyn-arashan", "ozero-sary-chelek", "han-tengri"];
  const places = placesPick.map((s) => pois.find((p) => p.slug === s)).filter(Boolean).slice(0, 4) as P[];
  const mosaic = [destinations.find((d) => d.slug === "jeti-oguz"), destinations.find((d) => d.slug === "kel-suu"), destinations.find((d) => d.slug === "arslanbob"),
    destinations.find((d) => d.slug === "tash-rabat"), destinations.find((d) => d.slug === "ala-kul")].filter(Boolean) as D[];

  return (
    <>
      {/* ---------- Первый экран ---------- */}
      <ExitScene className="relative flex min-h-[100svh] items-end overflow-hidden bg-forest-deep text-white">
        {/* Слой 1 — пейзаж: уходит медленнее страницы и приближается */}
        <div className="hero-bg absolute inset-0">
          {hero?.cover && <Image src={hero.cover.url} alt={hero.cover.alt} fill priority sizes="100vw" className="object-cover" />}
        </div>
        <div className="hero-shade absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35" />
        {/* Слои 2–3 — хребты: дальний и ближний двигаются с разной скоростью */}
        <Ridges />
        {/* Слой 4 — текст: уходит быстрее всех и растворяется */}
        <div className="hero-copy container-x relative pt-[calc(var(--header-h)+48px)] pb-[17vh] sm:pb-[19vh]">
          <p className="hero-in eyebrow mb-6 text-sky">{L("Туристический портал Кыргызстана")}</p>
          <h1 className="hero-in-2 h-display max-w-5xl text-[40px] min-[400px]:text-[48px] sm:text-[76px] lg:text-[96px] xl:text-[104px]">
            {L("Открой Кыргызстан.")}
            <br />
            <em className="font-normal text-sand">{L("Найди своё путешествие.")}</em>
          </h1>
          <p className="hero-in-3 mt-7 max-w-xl text-[17px] leading-relaxed text-white/85 sm:text-lg">
            {L("Высокогорные озёра, кочевые пастбища и города Шёлкового пути. Выберите готовый маршрут или соберите свой — и сразу узнайте ориентировочную стоимость.")}
          </p>
          <div className="hero-in-3 mt-9 flex flex-col gap-5 lg:flex-row lg:items-center">
            <Link href="#explore" className="btn-light !px-7 !py-4 text-[15px]">
              {L("Исследовать Кыргызстан")} <ArrowRight size={17} />
            </Link>
            <HeroSearch />
          </div>
        </div>
        <PhotoCredit photo={hero?.cover} className="absolute top-[calc(var(--header-h)+12px)] right-4 hidden text-white sm:block" />
      </ExitScene>

      {/* ---------- Введение ---------- */}
      <section id="explore" className="container-x scroll-mt-24 py-20 md:py-28">
        <Reveal className="grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-end">
          <Parallax speed={-40} className="px-lg-only">
            <h2 className="h-display text-[34px] text-forest sm:text-[48px] lg:text-[56px]">
              {L("Страна, где почти вся территория — горы, а дорога к озеру идёт через перевал.")}
            </h2>
          </Parallax>
          <div className="space-y-6">
            <p className="text-[17px] leading-relaxed text-stone">
              {L("TurMax собирает направления, достопримечательности и маршруты местных операторов в одном месте. Смотрите места на карте, сравнивайте туры по длительности, сложности и сезону и отправляйте заявку без переписки в мессенджерах.")}
            </p>
            <dl className="grid grid-cols-3 border-t border-forest/15 pt-6">
              {[
                [destinations.length, L("направлений")],
                [pois.length, L("мест на карте")],
                [tours.total, L("маршрутов")],
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
        <SectionHeader eyebrow={L("Популярные направления")} title={L("Куда поехать в первую очередь")} href="/destinations" linkLabel={L("Все направления")} />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12">
          {featured[0] && (
            <Reveal variant="clip" className="md:col-span-2 lg:col-span-6 lg:row-span-2">
              <DestinationCard d={featured[0]} size="lg" priority />
            </Reveal>
          )}
          {featured.slice(1, 5).map((d, i) => (
            <Reveal key={d.id} variant="clip" className="lg:col-span-3" delay={150 + i * 120}>
              {/* Карточки правой колонки «плывут» с разной скоростью — мозаика получает объём */}
              <Parallax speed={i % 2 === 0 ? -50 : 50} className="px-lg-only">
                <DestinationCard d={d} />
              </Parallax>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Раскрывающаяся сцена ---------- */}
      {expand && (
        <ExpandScene
          d={expand}
          title={L("Горы ближе, чем кажется")}
          text={L("Бирюзовое озеро под ледниками Терскей Ала-Тоо — цель самого известного треккинга страны. Три-четыре дня пути из Каракола.")}
        />
      )}

      {/* ---------- Категории: смена сцен ---------- */}
      <ExperienceSwitcher categories={categories} />

      {/* ---------- Рекомендуемые маршруты: горизонтальная лента ---------- */}
      <HorizontalScroll
        header={
          <SectionHeader eyebrow={L("Рекомендуемые маршруты")} title={L("Готовые маршруты местных операторов")} text={L("Программа по дням, карта, сложность и ближайшие выезды — всё, чтобы сравнить предложения и выбрать своё.")} href="/tours" linkLabel={L("Каталог маршрутов")} />
        }
      >
        {tours.items.slice(0, 6).map((t) => (
          <TourCard key={t.id} t={t} />
        ))}
        <Link href="/tours" className="group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-sm bg-turquoise p-8 text-white transition-colors duration-500 hover:bg-turquoise-light">
          <p className="eyebrow text-white/80">{L("Каталог")}</p>
          <div>
            <p className="h-display text-[40px]">{L("Все")} {tours.total} {L("маршрутов")}</p>
            <p className="mt-3 text-[15px] text-white/85">{L("Фильтры по региону, сезону, сложности, бюджету и языку гида")}</p>
            <ArrowRight className="mt-6 transition-transform duration-500 group-hover:translate-x-2" size={26} />
          </div>
        </Link>
      </HorizontalScroll>

      {/* ---------- Карта ---------- */}
      <section className="bg-sand py-24 md:py-32">
        <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.6fr] lg:items-center">
          <Reveal variant="left">
            <p className="eyebrow mb-3 text-turquoise">{L("Интерактивная карта")}</p>
            <h2 className="h-display text-[34px] text-forest sm:text-[48px]">{L("Вся страна на одной карте")}</h2>
            <p className="mt-5 text-[16.5px] leading-relaxed text-stone">
              {points.length} {L("точек: направления, озёра, перевалы, памятники истории и горячие источники. Нажмите на маркер, чтобы увидеть описание и перейти на страницу места.")}
            </p>
            <Link href="/map" className="btn-primary mt-8">
              <MapIcon size={17} /> {L("Открыть карту")}
            </Link>
          </Reveal>
          <Reveal variant="scale" className="h-[420px] overflow-hidden rounded-sm border border-forest/10 shadow-xl md:h-[540px]">
            <HomeMap points={points} />
          </Reveal>
        </div>
      </section>

      {/* ---------- Интересные места ---------- */}
      <section className="container-x py-24 md:py-32">
        <SectionHeader eyebrow={L("Интересные места")} title={L("То, ради чего стоит свернуть с трассы")} href="/map" linkLabel={L("Все места на карте")} />
        <Stagger>
          <Rail>
            {places.map((p) => (
              <PoiCard key={p.id} p={p} />
            ))}
          </Rail>
        </Stagger>
      </section>

      {/* ---------- Журнал ---------- */}
      <section className="border-t border-forest/10 bg-white py-24 md:py-32">
        <div className="container-x">
          <SectionHeader eyebrow={L("Журнал TurMax")} title={L("Истории и советы для поездки")} href="/journal" linkLabel={L("Все статьи")} />
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
            {articles.items[0] && (
              <Reveal variant="clip">
                <ArticleCard a={articles.items[0]} large />
              </Reveal>
            )}
            <div className="grid gap-12">
              {articles.items.slice(1, 3).map((a, i) => (
                <Reveal key={a.id} variant="clip" delay={200 + i * 150}>
                  <ArticleCard a={a} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Вдохновение ---------- */}
      <section className="bg-forest-deep py-24 text-white md:py-32">
        <div className="container-x">
          <SectionHeader light eyebrow={L("Вдохновение")} title={L("Кыргызстан в кадре")} text={L("Фотографии путешественников из Wikimedia Commons — нажмите, чтобы открыть направление.")} />
          <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4">
            {mosaic.map((d, i) => (
              <Parallax
                key={d.id}
                speed={[0, -70, 40, -30, 60][i]}
                className={`px-lg-only ${i === 0 ? "col-span-2 row-span-2" : i === 3 ? "col-span-2" : ""}`}
              >
              <Link
                href={`/destinations/${d.slug}`}
                className="group relative block h-full overflow-hidden rounded-sm"
              >
                <ParallaxImage photo={d.cover} alt={d.name} strength={14} zoom sizes="(max-width: 768px) 50vw, 30vw" className="zoom-img !absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80 transition group-hover:opacity-100" />
                <span className="absolute bottom-3 left-4 font-display text-xl transition-transform duration-500 group-hover:-translate-y-1">{d.name}</span>
              </Link>
              </Parallax>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Призыв к планированию ---------- */}
      <section className="container-x py-24 md:py-32">
        <Reveal variant="scale" className="grid overflow-hidden rounded-sm bg-white lg:grid-cols-2">
          <ParallaxImage photo={destinations.find((d) => d.slug === "kel-suu")?.cover} alt={L("Озеро Кель-Суу")} strength={14} sizes="(max-width: 1024px) 100vw, 50vw" className="min-h-[320px]" />
          <div className="p-8 sm:p-12 lg:p-16">
            <p className="eyebrow mb-3 text-turquoise">{L("Конструктор маршрута")}</p>
            <h2 className="h-display text-[34px] text-forest sm:text-[46px]">{L("Спланируйте поездку за несколько минут")}</h2>
            <ol className="mt-8 space-y-5">
              {[
                [Route, L("Выберите точки на карте и распределите их по дням")],
                [Calculator, L("Получите смету: транспорт, проживание, питание, гид и сборы")],
                [Send, L("Отправьте заявку оператору и следите за статусом в кабинете")],
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
              {L("Собрать свой маршрут")} <ArrowRight size={17} />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
