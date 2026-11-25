// Языки интерфейса (FR-21). Русский — исходный: ключом перевода служит сама русская фраза (подход gettext),
// поэтому при отсутствии перевода интерфейс показывает русский текст, а не «пустой ключ».
export const LOCALES = ["ru", "ky", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "turmax_lang";

export const LOCALE_NAMES: Record<Locale, { short: string; native: string }> = {
  ru: { short: "RU", native: "Русский" },
  ky: { short: "KY", native: "Кыргызча" },
  en: { short: "EN", native: "English" },
};

/** Локаль для Intl (даты, числа). */
export const INTL: Record<Locale, string> = { ru: "ru-RU", ky: "ky-KG", en: "en-GB" };

export function normalizeLocale(v?: string | null): Locale {
  const l = (v ?? "").slice(0, 2).toLowerCase();
  return (LOCALES as readonly string[]).includes(l) ? (l as Locale) : DEFAULT_LOCALE;
}
