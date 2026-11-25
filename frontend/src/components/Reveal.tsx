"use client";

import { Children, Fragment, cloneElement, isValidElement, useEffect, useRef } from "react";

/** Подписка элемента на появление в окне: добавляет классы-«взвод» и is-visible. Без JS контент остаётся видимым. */
function useInView<T extends HTMLElement>(armClass: string, margin = "0px 0px -10% 0px") {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add(...armClass.split(" "));
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [armClass, margin]);
  return ref;
}

/**
 * Появление блока при прокрутке.
 * variant: "up" — подъём с проявлением, "clip" — фото открывается «шторкой» снизу с отдалением,
 * "scale" — лёгкое увеличение, "left" — выезд слева.
 */
export function Reveal({
  children, className = "", delay = 0, variant = "up",
}: { children: React.ReactNode; className?: string; delay?: number; variant?: "up" | "clip" | "scale" | "left" }) {
  const ref = useInView<HTMLDivElement>("reveal");
  return (
    <div ref={ref} data-v={variant} className={className} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

/** Контейнер, дети которого появляются по очереди (каскадом). */
export function Stagger({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useInView<HTMLDivElement>("stagger stagger-armed");
  let i = 0;
  return (
    <div ref={ref} className={`stagger ${className}`}>
      {Children.map(children, (child) =>
        isValidElement<{ style?: React.CSSProperties }>(child)
          ? cloneElement(child, { style: { ...(child.props.style ?? {}), ["--i" as string]: Math.min(i++, 8) } })
          : child,
      )}
    </div>
  );
}

/** Заголовок, слова которого выезжают из-под маски по очереди. */
export function SplitTitle({ text, className = "", as: Tag = "h2" }: { text: string; className?: string; as?: "h1" | "h2" | "p" }) {
  const ref = useInView<HTMLHeadingElement>("split-armed");
  const words = text.split(" ");
  return (
    <Tag ref={ref} className={`split-ready ${className}`} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="split-word" aria-hidden>
            <span style={{ ["--w" as string]: i }}>{w}</span>
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </Tag>
  );
}
