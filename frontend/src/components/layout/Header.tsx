"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, UserRound, X, ArrowRight, LogOut } from "lucide-react";
import { homeFor, useAuth } from "@/components/auth/AuthProvider";
import { Logo } from "./Logo";

const NAV = [
  { href: "/destinations", label: "Направления" },
  { href: "/tours", label: "Маршруты" },
  { href: "/categories", label: "Впечатления" },
  { href: "/map", label: "Карта" },
  { href: "/journal", label: "Журнал" },
];

// Страницы с полноэкранной обложкой — шапка над ними прозрачная.
const HERO = [/^\/$/, /^\/destinations\/[^/]+$/, /^\/attractions\/[^/]+$/, /^\/tours\/[^/]+$/, /^\/journal\/[^/]+$/, /^\/categories\/[^/]+$/, /^\/categories$/];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const overHero = HERO.some((r) => r.test(pathname)) && !scrolled && !menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSearchOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length >= 2) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const tone = overHero ? "text-white" : "text-forest";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[1000] transition-[background,box-shadow,color] duration-500 ${
          overHero ? "bg-gradient-to-b from-black/45 to-transparent" : "bg-sand-light/95 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur-md"
        }`}
      >
        <div className={`container-x flex h-[var(--header-h)] items-center gap-6 ${tone}`}>
          <Link href="/" aria-label="TurMax — на главную" className="shrink-0">
            <Logo light={overHero} />
          </Link>

          <nav aria-label="Основная навигация" className="ml-6 hidden flex-1 items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`link-underline text-[14px] ${pathname.startsWith(n.href) ? "after:scale-x-100" : ""}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              aria-label="Поиск"
              onClick={() => setSearchOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-sm transition hover:bg-white/15"
            >
              <Search size={19} />
            </button>
            <Link
              href="/planner"
              className={`hidden md:inline-flex ${overHero ? "btn-ghost-light" : "btn-primary"} !px-4 !py-2.5`}
            >
              Спланировать поездку
            </Link>
            {ready && (
              <Link
                href={user ? homeFor(user) : "/login"}
                aria-label={user ? "Личный кабинет" : "Войти"}
                className="hidden h-10 items-center gap-2 rounded-sm px-2 text-[14px] font-semibold transition hover:bg-white/15 sm:inline-flex"
              >
                <UserRound size={19} />
                <span className="hidden xl:inline">{user ? user.fullName.split(" ")[0] : "Войти"}</span>
              </Link>
            )}
            <button
              type="button"
              aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-sm transition hover:bg-white/15 lg:hidden"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Мобильное меню */}
      <div
        className={`fixed inset-0 z-[999] bg-forest-deep text-white transition-[opacity,visibility] duration-500 lg:hidden ${
          menuOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="container-x flex h-full flex-col pt-[calc(var(--header-h)+24px)] pb-10">
          <nav aria-label="Мобильная навигация" className="flex flex-col">
            {[...NAV, { href: "/planner", label: "Конструктор маршрута" }].map((n, i) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center justify-between border-b border-white/10 py-4 font-display text-[28px]"
                style={{ transitionDelay: `${i * 40}ms` }}
              >
                {n.label}
                <ArrowRight size={20} className="text-turquoise-light" />
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            {user ? (
              <>
                <Link href={homeFor(user)} className="btn-light">Личный кабинет</Link>
                <button onClick={() => logout()} className="btn-ghost-light">
                  <LogOut size={16} /> Выйти
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-light">Войти</Link>
                <Link href="/register" className="btn-ghost-light">Регистрация</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Поиск поверх страницы */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Поиск по сайту"
        className={`fixed inset-0 z-[1100] bg-forest-deep/96 backdrop-blur-sm transition-[opacity,visibility] duration-300 ${
          searchOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
        onClick={(e) => e.target === e.currentTarget && setSearchOpen(false)}
      >
        <div className="container-x pt-28 sm:pt-40">
          <button
            type="button"
            aria-label="Закрыть поиск"
            onClick={() => setSearchOpen(false)}
            className="absolute top-5 right-5 grid h-11 w-11 place-items-center text-white/80 hover:text-white"
          >
            <X size={26} />
          </button>
          <p className="eyebrow mb-5 text-sky">Поиск по TurMax</p>
          <form onSubmit={submitSearch} className="flex items-end gap-4 border-b border-white/30 pb-3 focus-within:border-turquoise-light">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Озеро, город, маршрут…"
              aria-label="Поисковый запрос"
              className="w-full bg-transparent font-display text-3xl text-white placeholder:text-white/35 focus:outline-none sm:text-5xl"
            />
            <button type="submit" aria-label="Найти" className="mb-1 text-white/80 hover:text-white">
              <ArrowRight size={32} />
            </button>
          </form>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Иссык-Куль", "Сон-Куль", "Каракол", "Ош", "трекинг", "юрта"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => router.push(`/search?q=${encodeURIComponent(s)}`)}
                className="rounded-xs border border-white/20 px-3 py-1.5 text-sm text-white/80 transition hover:border-white hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
