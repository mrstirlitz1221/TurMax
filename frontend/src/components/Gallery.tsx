"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { PhotoCredit } from "@/components/ui";
import type { Photo } from "@/lib/types";

/** Галерея: мозаика превью и полноэкранный просмотр с клавиатурой и свайпом. */
export function Gallery({ photos, title }: { photos: Photo[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  if (photos.length === 0) return null;
  const shown = photos.slice(0, 5);

  return (
    <>
      <div className="grid auto-rows-[150px] grid-cols-2 gap-2 sm:auto-rows-[200px] md:grid-cols-4">
        {shown.map((p, i) => (
          <button
            key={p.url}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Открыть фото ${i + 1} из ${photos.length}`}
            className={`zoom-img group relative overflow-hidden rounded-sm bg-mist ${i === 0 ? "col-span-2 row-span-2" : ""}`}
          >
            <Image src={p.url} alt={p.alt || title} fill sizes={i === 0 ? "(max-width: 768px) 100vw, 50vw" : "25vw"} className="object-cover" />
            {i === shown.length - 1 && photos.length > shown.length && (
              <span className="absolute inset-0 grid place-items-center bg-black/45 text-lg font-semibold text-white">+{photos.length - shown.length}</span>
            )}
            <Expand size={16} className="absolute top-3 right-3 text-white opacity-0 drop-shadow transition group-hover:opacity-100" aria-hidden />
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Фотогалерея: ${title}`}
          className="fixed inset-0 z-[1200] flex flex-col bg-black/95 text-white"
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            setTouchX(null);
          }}
        >
          <div className="flex items-center justify-between px-5 py-4 text-sm">
            <span>{open + 1} / {photos.length}</span>
            <button type="button" onClick={close} aria-label="Закрыть" className="grid h-10 w-10 place-items-center hover:text-sky">
              <X size={24} />
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={photos[open].url} alt={photos[open].alt || title} fill sizes="100vw" className="object-contain" />
            {photos.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Предыдущее фото" className="absolute top-1/2 left-3 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/25">
                  <ChevronLeft />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Следующее фото" className="absolute top-1/2 right-3 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/25">
                  <ChevronRight />
                </button>
              </>
            )}
          </div>
          <div className="px-5 py-4 text-center">
            <PhotoCredit photo={photos[open]} />
          </div>
        </div>
      )}
    </>
  );
}
