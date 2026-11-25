"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Globe } from "lucide-react";
import { LOCALE_COOKIE, LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api-client";
import type { User } from "@/lib/types";

/** Запоминает язык в cookie (читает сервер Next.js) и, если пользователь вошёл, в профиле. */
export function saveLocaleCookie(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
}

/** Переключатель языка интерфейса: RU / KY / EN (FR-21). */
export function LanguageSwitcher({ variant = "header", light = false }: { variant?: "header" | "menu"; light?: boolean }) {
  const { locale, L } = useI18n();
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const choose = async (l: Locale) => {
    setOpen(false);
    if (l === locale) return;
    saveLocaleCookie(l);
    if (user) await api<User>("/auth/me/language", { method: "PUT", body: { language: l } }).then(setUser).catch(() => {});
    start(() => router.refresh());
  };

  if (variant === "menu")
    return (
      <div className="flex gap-2" role="group" aria-label={L("Язык интерфейса")}>
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={l === locale}
            onClick={() => choose(l)}
            className={`flex-1 rounded-sm border px-3 py-2.5 text-sm font-semibold transition ${l === locale ? "border-white bg-white text-forest" : "border-white/30 text-white hover:border-white"}`}
          >
            {LOCALE_NAMES[l].native}
          </button>
        ))}
      </div>
    );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${L("Язык интерфейса")}: ${LOCALE_NAMES[locale].native}`}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 items-center gap-1.5 rounded-sm px-2 text-[13px] font-semibold transition hover:bg-white/15 ${pending ? "opacity-60" : ""}`}
      >
        <Globe size={17} aria-hidden />
        {LOCALE_NAMES[locale].short}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={L("Язык интерфейса")}
          className={`absolute right-0 mt-2 w-44 overflow-hidden rounded-sm border py-1 shadow-xl ${light ? "border-white/15 bg-forest-deep text-white" : "border-graphite/10 bg-white text-graphite"}`}
        >
          {LOCALES.map((l) => (
            <li key={l} role="option" aria-selected={l === locale}>
              <button type="button" lang={l} onClick={() => choose(l)} className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[14px] ${light ? "hover:bg-white/10" : "hover:bg-sand-light"}`}>
                <span>
                  {LOCALE_NAMES[l].native} <span className="ml-1 text-[12px] opacity-60">{LOCALE_NAMES[l].short}</span>
                </span>
                {l === locale && <Check size={15} className="text-turquoise" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
