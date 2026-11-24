import Image, { type ImageProps } from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, ImageOff, Star } from "lucide-react";
import type { Photo } from "@/lib/types";

/** Фото из БД с запасным фоном, если изображения нет. */
export function Img({ photo, alt, className = "", ...rest }: { photo?: Photo | null; alt?: string } & Omit<ImageProps, "src" | "alt">) {
  if (!photo?.url)
    return (
      <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-forest-soft to-forest text-white/40 ${className}`}>
        <ImageOff size={28} aria-hidden />
      </div>
    );
  return <Image src={photo.url} alt={alt ?? photo.alt} className={`object-cover ${className}`} {...rest} />;
}

/** Подпись автора фотографии и лицензии (требование лицензий CC). */
export function PhotoCredit({ photo, className = "" }: { photo?: Photo | null; className?: string }) {
  if (!photo || (!photo.author && !photo.sourceUrl)) return null;
  const text = ["Фото", photo.author, photo.license].filter(Boolean).join(" · ");
  return photo.sourceUrl ? (
    <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className={`text-[11px] opacity-70 hover:opacity-100 ${className}`}>
      {text} — Wikimedia Commons
    </a>
  ) : (
    <span className={`text-[11px] opacity-70 ${className}`}>{text}</span>
  );
}

export function SectionHeader({
  eyebrow, title, text, href, linkLabel = "Смотреть все", light = false,
}: { eyebrow?: string; title: string; text?: string; href?: string; linkLabel?: string; light?: boolean }) {
  return (
    <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className={`eyebrow mb-3 ${light ? "text-sky" : "text-turquoise"}`}>{eyebrow}</p>}
        <h2 className={`h-display text-[34px] sm:text-[44px] lg:text-[52px] ${light ? "text-white" : "text-forest"}`}>{title}</h2>
        {text && <p className={`mt-4 text-[16.5px] leading-relaxed ${light ? "text-white/70" : "text-stone"}`}>{text}</p>}
      </div>
      {href && (
        <Link href={href} className={`link-underline shrink-0 text-[14px] ${light ? "text-white" : "text-forest"}`}>
          {linkLabel} <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}

export function Breadcrumbs({ items, light = false }: { items: { href?: string; label: string }[]; light?: boolean }) {
  return (
    <nav aria-label="Навигационная цепочка" className={`text-[13px] ${light ? "text-white/75" : "text-stone"}`}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={13} aria-hidden className="opacity-60" />}
            {it.href ? (
              <Link href={it.href} className="hover:underline">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Rating({ value, count, light = false }: { value: number; count: number; light?: boolean }) {
  if (count === 0) return <span className={`text-[12.5px] ${light ? "text-white/70" : "text-stone"}`}>Пока без отзывов</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] font-semibold ${light ? "text-white" : "text-graphite"}`}>
      <Star size={14} className="fill-[#e3a83b] text-[#e3a83b]" aria-hidden />
      {value.toFixed(1)}
      <span className="font-normal opacity-60">({count})</span>
    </span>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "info" | "warn" | "ok" | "bad"; children: React.ReactNode }) {
  const tones = {
    neutral: "bg-mist text-stone",
    info: "bg-sky/30 text-[#1c5873]",
    warn: "bg-[#f6e3c2] text-[#8a5a12]",
    ok: "bg-turquoise/12 text-turquoise",
    bad: "bg-clay/12 text-clay",
  };
  return <span className={`inline-flex items-center rounded-xs px-2 py-0.5 text-[12px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <p className="font-display text-2xl text-forest">{title}</p>
      {text && <p className="mt-2 max-w-md text-stone">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function DemoNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[12px] leading-snug text-stone ${className}`}>
      Цены и тарифы демонстрационные — итоговую стоимость подтверждает оператор.
    </p>
  );
}
