"use client";

import { useEffect, useRef } from "react";
import type { ImageProps } from "next/image";
import { Img } from "@/components/ui";
import type { Photo } from "@/lib/types";
import { register, type ScrollMode } from "./engine";

function useScrollVar<T extends HTMLElement>(mode: ScrollMode) {
  const ref = useRef<T>(null);
  useEffect(() => (ref.current ? register(ref.current, mode) : undefined), [mode]);
  return ref;
}

/**
 * Блок, смещающийся при прокрутке со своей скоростью: speed — амплитуда в пикселях
 * (положительная — отстаёт и кажется дальше, отрицательная — обгоняет и кажется ближе).
 */
export function Parallax({ speed = 60, className = "", children }: { speed?: number; className?: string; children: React.ReactNode }) {
  const ref = useScrollVar<HTMLDivElement>("view");
  return (
    <div ref={ref} className={`px-move ${className}`} style={{ "--px-speed": `${speed}px` } as React.CSSProperties}>
      {children}
    </div>
  );
}

/**
 * Фото, «плавающее» внутри своей рамки: изображение больше контейнера и сдвигается медленнее страницы —
 * создаётся ощущение окна, через которое смотришь на пейзаж.
 */
export function ParallaxImage({
  photo, alt, strength = 10, className = "", sizes, priority, zoom = false,
}: { photo?: Photo | null; alt?: string; strength?: number; className?: string; sizes: string; priority?: boolean; zoom?: boolean } & Pick<ImageProps, "quality">) {
  const ref = useScrollVar<HTMLDivElement>("view");
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={{ "--px-img": `${strength}%` } as React.CSSProperties}>
      <div className={`px-img absolute inset-x-0 ${zoom ? "px-img-zoom" : ""}`} style={{ top: `-${strength}%`, bottom: `-${strength}%` }}>
        <Img photo={photo} alt={alt} fill sizes={sizes} priority={priority} />
      </div>
    </div>
  );
}

/** Обёртка для обложки: передаёт потомкам --p от 0 (верх страницы) до 1 (обложка прокручена). */
export function ExitScene({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const ref = useScrollVar<HTMLElement>("exit");
  return (
    <section ref={ref} className={className}>
      {children}
    </section>
  );
}

/** Высокий контейнер с липкой сценой внутри: --p растёт от 0 до 1, пока сцена закреплена на экране. */
export function StickyScene({ height = "220vh", className = "", children }: { height?: string; className?: string; children: React.ReactNode }) {
  const ref = useScrollVar<HTMLElement>("sticky");
  return (
    <section ref={ref} className={`relative ${className}`} style={{ height }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">{children}</div>
    </section>
  );
}
