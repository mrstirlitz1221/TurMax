"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";
import { register } from "@/components/parallax/engine";
import { SplitTitle } from "@/components/Reveal";
import type { Category } from "@/lib/types";
import { useI18n } from "@/i18n/client";

const DURATION = 7000;

/**
 * «Как вы хотите путешествовать?» — полноэкранная сцена в духе visittheusa.com:
 * фон плавно сменяется между категориями (с медленным приближением), список слева управляет сценой,
 * карточка справа анимированно перестраивается. Есть автопрокрутка с индикатором, пауза при наведении,
 * управление с клавиатуры и параллакс фона при прокрутке страницы.
 */
export function ExperienceSwitcher({ categories }: { categories: Category[] }) {
  const { L, Lp } = useI18n();
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [cycle, setCycle] = useState(0); // перезапуск анимации индикатора
  const sceneRef = useRef<HTMLElement>(null);
  const items = categories.slice(0, 7);
  const c = items[active];

  useEffect(() => (sceneRef.current ? register(sceneRef.current, "view") : undefined), []);

  const go = useCallback((i: number) => {
    setActive((i + items.length) % items.length);
    setCycle((n) => n + 1);
  }, [items.length]);

  useEffect(() => {
    if (!playing || hover || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(active + 1), DURATION);
    return () => clearTimeout(t);
  }, [active, playing, hover, go, cycle]);

  if (!c) return null;

  return (
    <section
      ref={sceneRef}
      aria-roledescription={L("карусель")}
      aria-label={L("Категории путешествий")}
      className={`relative isolate min-h-[100svh] overflow-hidden bg-forest-deep text-white ${hover || !playing ? "xp-paused" : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); go(active + 1); }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); go(active - 1); }
      }}
    >
      {/* Фоновые сцены: сменяются плавным наплывом, весь слой медленнее страницы */}
      <div className="px-img absolute inset-x-0 -top-[10%] -bottom-[10%] -z-10" style={{ "--px-img": "10%" } as React.CSSProperties}>
        {items.map((x, i) =>
          x.imageUrl ? (
            <div key={x.id} className={`xp-slide absolute inset-0 ${i === active ? "is-active" : ""}`} aria-hidden={i !== active}>
              <Image src={x.imageUrl} alt="" fill sizes="100vw" className="object-cover" priority={i === 0} />
            </div>
          ) : null,
        )}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-forest-deep/95 via-forest-deep/55 to-forest-deep/10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest-deep/80 via-transparent to-forest-deep/40" />

      <div className="container-x grid min-h-[100svh] gap-10 py-24 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-28">
        <div>
          <p className="eyebrow mb-4 text-sky">{L("Категории путешествий")}</p>
          <SplitTitle text={L("Как вы хотите путешествовать?")} className="h-display max-w-xl text-[40px] sm:text-[56px] lg:text-[64px]" />

          {/* Список-переключатель */}
          <ol role="tablist" aria-label={L("Выбор категории")} className="no-scrollbar -mx-5 mt-10 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:px-0">
            {items.map((x, i) => (
              <li key={x.id} className="shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-controls="xp-panel"
                  onClick={() => go(i)}
                  onMouseEnter={() => i !== active && go(i)}
                  className={`group/xp relative flex w-full items-baseline gap-4 rounded-sm border px-4 py-2.5 text-left transition-colors duration-500 lg:border-0 lg:px-0 lg:py-2 ${
                    i === active ? "border-white bg-white text-forest lg:bg-transparent lg:text-white" : "border-white/25 text-white/55 hover:text-white"
                  }`}
                >
                  <span className="hidden font-mono text-[12px] tabular-nums lg:inline">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`whitespace-nowrap font-display text-[17px] transition-all duration-500 lg:text-[30px] ${i === active ? "lg:translate-x-2" : "group-hover/xp:lg:translate-x-1"}`}>
                    {x.name}
                  </span>
                  {i === active && (
                    <span className="absolute inset-x-0 -bottom-px hidden h-px overflow-hidden bg-white/15 lg:block">
                      <span key={cycle} className="xp-progress block h-full bg-turquoise-light" style={{ "--xp-dur": `${DURATION}ms` } as React.CSSProperties} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* Карточка активной категории */}
        <div id="xp-panel" role="tabpanel" aria-live="polite" className="lg:justify-self-end">
          <div key={c.id} className="xp-copy max-w-md rounded-sm border border-white/15 bg-forest-deep/45 p-7 backdrop-blur-md sm:p-9">
            <p className="eyebrow text-turquoise-light">
              {c.toursCount > 0 && `${Lp(c.toursCount, "маршрут", "маршрута", "маршрутов")} · `}
              {Lp(c.destinationsCount, "направление", "направления", "направлений")}
            </p>
            <h3 className="h-display mt-3 text-[38px] sm:text-[46px]">{c.name}</h3>
            <p className="mt-4 text-[16px] leading-relaxed text-white/80">{c.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/categories/${c.slug}`} className="btn-light">
                {L("Открыть")} <ArrowRight size={16} />
              </Link>
              <Link href={`/tours?category=${c.slug}`} className="btn-ghost-light">{L("Маршруты")}</Link>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-4 text-[13px] text-white/70">
            <button type="button" onClick={() => setPlaying((v) => !v)} aria-label={playing ? L("Остановить автопрокрутку") : L("Запустить автопрокрутку")} className="grid h-9 w-9 place-items-center rounded-full border border-white/30 hover:bg-white hover:text-forest">
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <span className="tabular-nums">{String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
            {c.imageCredit && <span className="ml-auto truncate text-[11px] opacity-70">{L("Фото:")} {c.imageCredit}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
