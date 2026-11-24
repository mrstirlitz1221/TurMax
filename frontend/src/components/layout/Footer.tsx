import Link from "next/link";
import { Logo } from "./Logo";

const COLS = [
  {
    title: "Путешествия",
    links: [
      { href: "/destinations", label: "Направления" },
      { href: "/tours", label: "Маршруты и туры" },
      { href: "/categories", label: "Категории путешествий" },
      { href: "/map", label: "Интерактивная карта" },
    ],
  },
  {
    title: "Планирование",
    links: [
      { href: "/planner", label: "Конструктор маршрута" },
      { href: "/journal", label: "Журнал и советы" },
      { href: "/search", label: "Поиск" },
    ],
  },
  {
    title: "Аккаунт",
    links: [
      { href: "/login", label: "Вход" },
      { href: "/register", label: "Регистрация туриста" },
      { href: "/register?type=operator", label: "Для туроператоров" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-forest-deep text-white/80">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:py-20">
        <div className="max-w-sm">
          <Logo light />
          <p className="mt-5 text-[15px] leading-relaxed text-white/65">
            Туристический портал Кыргызстана: направления, маршруты, конструктор поездки с расчётом стоимости и заявки
            местным операторам в одном месте.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="eyebrow mb-4 text-sky">{c.title}</p>
            <ul className="space-y-2.5 text-[15px]">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-[12.5px] text-white/50 md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} TurMax — дипломный проект. Цены, тарифы и операторы на сайте — демонстрационные.</p>
          <p>
            Фото: Wikimedia Commons (авторы указаны на страницах). Карта: ©{" "}
            <a className="underline hover:text-white" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              участники OpenStreetMap
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
