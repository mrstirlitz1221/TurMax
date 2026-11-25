"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/client";

/** Честная пометка: перевод основного текста ещё не добавлен, поэтому показан русский оригинал. */
export function UntranslatedNote({ show }: { show?: boolean }) {
  const { L, locale } = useI18n();
  if (!show || locale === "ru") return null;
  return (
    <p className="mb-6 flex items-center gap-2 rounded-sm bg-sky/20 px-4 py-3 text-[14px] text-[#1c5873]" lang={locale}>
      <Languages size={17} aria-hidden /> {L("Основной текст пока доступен только на русском языке.")}
    </p>
  );
}
