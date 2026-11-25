import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { StickyScene } from "@/components/parallax";
import { PhotoCredit } from "@/components/ui";
import type { DestinationCard } from "@/lib/types";
import { getI18n } from "@/i18n/server";

/**
 * Полноэкранная сцена с закреплением: при прокрутке кадр раскрывается из небольшого «окна» на весь экран,
 * изображение плавно отдаляется, заголовок уходит, а поверх появляется подпись направления.
 */
export async function ExpandScene({ d, title, text }: { d: DestinationCard; title: string; text: string }) {
  const { L } = await getI18n();
  return (
    <StickyScene height="240vh" className="bg-sand-light">
      <div className="expand-title absolute inset-x-0 top-[9vh] z-10 text-center">
        <p className="eyebrow text-turquoise">{d.region}</p>
        <h2 className="h-display container-x mt-3 text-[38px] text-forest sm:text-[64px] lg:text-[80px]">{title}</h2>
      </div>
      <div className="expand-frame absolute inset-0 bg-forest-deep">
        {d.cover && (
          <div className="expand-img absolute inset-0">
            <Image src={d.cover.url} alt={d.cover.alt} fill sizes="100vw" className="object-cover" />
          </div>
        )}
        <div className="expand-shade absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="expand-copy container-x absolute inset-x-0 bottom-0 pb-16 text-white sm:pb-24">
          <p className="eyebrow text-sky">{d.tagline}</p>
          <p className="h-display mt-3 text-[56px] sm:text-[96px] lg:text-[128px]">{d.name}</p>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-white/85">{text}</p>
          <Link href={`/destinations/${d.slug}`} className="btn-light mt-8 !px-7 !py-4">
            {L("Открыть направление")} <ArrowRight size={17} />
          </Link>
          <PhotoCredit photo={d.cover} className="mt-6 block text-white" />
        </div>
      </div>
    </StickyScene>
  );
}
