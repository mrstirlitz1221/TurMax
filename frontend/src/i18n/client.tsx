"use client";

import { createContext, useContext, useMemo } from "react";
import { setApiLocale } from "@/lib/api-client";
import type { Locale } from "./config";
import { createI18n, type I18n } from "./core";

const Ctx = createContext<I18n | null>(null);

/** Передаёт язык клиентским компонентам и клиенту API (заголовок X-Lang). */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => createI18n(locale), [locale]);
  setApiLocale(locale);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n вне I18nProvider");
  return v;
}
