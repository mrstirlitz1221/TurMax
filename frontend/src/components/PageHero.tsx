import Image from "next/image";
import { Breadcrumbs, PhotoCredit } from "@/components/ui";
import type { Photo } from "@/lib/types";
import { ExitScene } from "@/components/parallax";
import { Ridges } from "@/components/parallax/Ridges";

/** Полноширинная обложка внутренней страницы: фото, хребты и текст двигаются с разной скоростью. */
export function PageHero({
  photo, eyebrow, title, subtitle, crumbs, children, tall = true, ridge = "var(--color-sand-light)",
}: {
  photo?: Photo | null; eyebrow?: string; title: string; subtitle?: string;
  crumbs: { href?: string; label: string }[]; children?: React.ReactNode; tall?: boolean; ridge?: string | null;
}) {
  return (
    <ExitScene className={`relative flex items-end overflow-hidden bg-forest-deep text-white ${tall ? "min-h-[82svh]" : "min-h-[62svh]"}`}>
      {photo && (
        <div className="hero-bg absolute inset-0">
          <Image src={photo.url} alt={photo.alt} fill priority sizes="100vw" className="object-cover" />
        </div>
      )}
      <div className="hero-shade absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35" />
      {ridge && <Ridges near={ridge} />}
      <div className={`hero-copy container-x relative pt-32 ${ridge ? "pb-[18vh]" : "pb-12 sm:pb-16"}`}>
        <Breadcrumbs light items={crumbs} />
        {eyebrow && <p className="hero-in eyebrow mt-8 text-sky">{eyebrow}</p>}
        <h1 className="hero-in-2 h-display mt-3 max-w-5xl text-[44px] sm:text-[72px] lg:text-[92px]">{title}</h1>
        {subtitle && <p className="hero-in-3 mt-5 max-w-2xl text-[17px] leading-relaxed text-white/85 sm:text-[19px]">{subtitle}</p>}
        {children && <div className="hero-in-3 mt-8">{children}</div>}
      </div>
      <PhotoCredit photo={photo} className="absolute top-[calc(var(--header-h)+12px)] right-4 hidden text-white md:block" />
    </ExitScene>
  );
}

/** Простая шапка для страниц-каталогов без фото. */
export function PageIntro({ eyebrow, title, text, crumbs, children }: { eyebrow?: string; title: string; text?: string; crumbs: { href?: string; label: string }[]; children?: React.ReactNode }) {
  return (
    <section className="bg-sand-light pt-[calc(var(--header-h)+40px)] pb-10 md:pb-14">
      <div className="container-x">
        <Breadcrumbs items={crumbs} />
        {eyebrow && <p className="eyebrow mt-8 text-turquoise">{eyebrow}</p>}
        <h1 className="h-display mt-3 max-w-4xl text-[42px] text-forest sm:text-[64px]">{title}</h1>
        {text && <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-stone">{text}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
