"use client";

import { useEffect, useRef } from "react";
import { register } from "@/components/parallax/engine";

/**
 * Горизонтальная лента, которую на больших экранах «прокручивает» обычная вертикальная прокрутка:
 * секция закрепляется, а карточки едут влево. На планшетах и телефонах — обычная лента со свайпом.
 */
export function HorizontalScroll({ header, children, className = "" }: { header: React.ReactNode; children: React.ReactNode; className?: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let unregister: () => void = () => {};

    const layout = () => {
      unregister();
      if (!mq.matches || reduced) {
        section.style.height = "";
        return;
      }
      const dist = Math.max(0, track.scrollWidth - track.clientWidth);
      section.style.setProperty("--dist", `${dist}px`);
      section.style.height = `${window.innerHeight + dist}px`;
      unregister = register(section, "sticky");
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(track);
    mq.addEventListener("change", layout);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", layout);
      unregister();
    };
  }, []);

  return (
    <section ref={sectionRef} className={`relative ${className}`}>
      <div className="flex flex-col justify-center py-20 lg:sticky lg:top-0 lg:h-[100svh] lg:overflow-hidden lg:py-0">
        <div className="container-x">{header}</div>
        <div
          ref={trackRef}
          className="hscroll-track no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-4 sm:px-8 lg:snap-none lg:overflow-visible lg:px-[max(3rem,calc((100vw-1360px)/2+3rem))] [&>*]:w-[78vw] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-[46vw] lg:[&>*]:w-[380px] xl:[&>*]:w-[420px]"
        >
          {children}
        </div>
        <div className="container-x mt-8 hidden lg:block">
          <div className="h-px bg-graphite/15">
            <div className="hscroll-bar h-px bg-forest" />
          </div>
        </div>
      </div>
    </section>
  );
}
