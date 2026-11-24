"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/ui";
import { BOOKING_STATUS, BOOKING_TONE, date, dateTime, som } from "@/lib/format";
import type { Booking, BookingHistory } from "@/lib/types";

/** Каркас кабинета: заголовок и вкладки-ссылки. */
export function CabinetShell({ title, subtitle, tabs, children }: { title: string; subtitle?: string; tabs: { href: string; label: string; badge?: number }[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <section className="container-x pt-[calc(var(--header-h)+40px)] pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="h-display text-[40px] text-forest sm:text-[52px]">{title}</h1>
          {subtitle && <p className="mt-2 text-stone">{subtitle}</p>}
        </div>
        <button onClick={async () => { await logout(); router.push("/"); }} className="inline-flex items-center gap-1.5 text-[14px] text-stone hover:text-clay">
          <LogOut size={16} /> Выйти
        </button>
      </div>
      <nav aria-label="Разделы кабинета" className="no-scrollbar mt-8 flex gap-6 overflow-x-auto border-b border-graphite/10">
        {tabs.map((t) => {
          const active = t.href === pathname || (t.href !== tabs[0].href && pathname.startsWith(t.href));
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={`-mb-px shrink-0 border-b-2 pb-3 text-[14.5px] font-semibold ${active ? "border-forest text-forest" : "border-transparent text-stone hover:text-forest"}`}>
              {t.label}
              {!!t.badge && <span className="ml-1.5 rounded-full bg-clay px-1.5 py-0.5 text-[11px] text-white">{t.badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-10">{children}</div>
    </section>
  );
}

export function StatusBadge({ status }: { status: Booking["status"] }) {
  return <Badge tone={BOOKING_TONE[status]}>{BOOKING_STATUS[status]}</Badge>;
}

export function BookingRow({ b, href, showTourist = false }: { b: Booking; href: string; showTourist?: boolean }) {
  return (
    <li>
      <Link href={href} className="card flex flex-col gap-3 p-5 transition hover:border-forest/40 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={b.status} />
            <span className="text-[12px] text-stone">{b.departureId ? "Готовый тур" : "Свой маршрут"} · от {dateTime(b.createdAt)}</span>
          </div>
          <p className="mt-1.5 truncate font-display text-xl text-forest">{b.title}</p>
          <p className="text-[13.5px] text-stone">
            {date(b.startDate)} · {b.participants} чел. · {showTourist ? b.touristName : b.operatorName}
          </p>
        </div>
        <p className="shrink-0 text-lg font-bold">{som(b.priceFinal ?? b.priceCalc)}</p>
      </Link>
    </li>
  );
}

export function HistoryTimeline({ items }: { items: BookingHistory[] }) {
  return (
    <ol className="relative space-y-5 border-l border-graphite/15 pl-6">
      {items.map((h, i) => (
        <li key={i} className="relative">
          <span className="absolute top-1.5 -left-[29px] h-2.5 w-2.5 rounded-full bg-turquoise ring-4 ring-sand-light" />
          <p className="text-[14.5px] font-semibold">
            {h.fromStatus ? `${BOOKING_STATUS[h.fromStatus]} → ` : ""}{BOOKING_STATUS[h.toStatus]}
          </p>
          <p className="text-[12.5px] text-stone">{dateTime(h.createdAt)} · {h.by ?? "Система"}</p>
          {h.note && <p className="mt-1 text-[14px] text-graphite/85">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
