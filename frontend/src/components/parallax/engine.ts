"use client";

/**
 * Лёгкий движок параллакса. Каждому зарегистрированному элементу на каждом кадре прокрутки записывается
 * CSS-переменная --p (0…1) — прогресс прохождения элемента через экран. Сами смещения описаны в CSS
 * через transform/opacity, поэтому React не перерисовывается, а браузер анимирует только композитные свойства.
 *
 * Режимы:
 *  - "view"   — 0, когда верх элемента у нижнего края экрана; 1, когда низ элемента ушёл за верхний край;
 *  - "exit"   — 0, когда элемент стоит в начале страницы; 1, когда он полностью прокручен (для обложек);
 *  - "sticky" — прогресс прокрутки внутри высокого контейнера с липким (sticky) содержимым.
 */
export type ScrollMode = "view" | "exit" | "sticky";

type Entry = { el: HTMLElement; mode: ScrollMode; visible: boolean; last: number };

const entries = new Set<Entry>();
let ticking = false;
let listening = false;
let io: IntersectionObserver | null = null;

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function measure(e: Entry, vh: number) {
  const r = e.el.getBoundingClientRect();
  let p: number;
  if (e.mode === "exit") p = -r.top / Math.max(r.height, 1);
  else if (e.mode === "sticky") p = -r.top / Math.max(r.height - vh, 1);
  else p = (vh - r.top) / (vh + r.height);
  p = Math.min(1, Math.max(0, p));
  if (Math.abs(p - e.last) > 0.0005) {
    e.last = p;
    e.el.style.setProperty("--p", p.toFixed(4));
  }
}

function frame() {
  ticking = false;
  const vh = window.innerHeight;
  entries.forEach((e) => e.visible && measure(e, vh));
}

function request() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(frame);
  }
}

function ensureListeners() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request, { passive: true });
  io = new IntersectionObserver(
    (list) => {
      list.forEach((it) => {
        entries.forEach((e) => {
          if (e.el === it.target) e.visible = it.isIntersecting;
        });
      });
      request();
    },
    { rootMargin: "20% 0px 20% 0px" },
  );
}

export function register(el: HTMLElement, mode: ScrollMode) {
  if (reduced()) return () => {};
  ensureListeners();
  const e: Entry = { el, mode, visible: true, last: -1 };
  entries.add(e);
  io!.observe(el);
  measure(e, window.innerHeight);
  return () => {
    entries.delete(e);
    io?.unobserve(el);
  };
}
