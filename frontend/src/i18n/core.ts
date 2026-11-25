import { INTL, type Locale } from "./config";
import en from "./messages/en";
import ky from "./messages/ky";

type Vars = Record<string, string | number>;
const KY_MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const DICTS: Record<Locale, Record<string, string>> = { ru: {}, en, ky };

function fill(s: string, vars?: Vars) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : s;
}

/** Формы множественного числа: ключ словаря — русские формы через «|» («день|дня|дней»). */
function pluralIndex(locale: Locale, n: number, forms: number) {
  if (locale === "ru") {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 0;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 1;
    return 2;
  }
  if (locale === "en") return n === 1 ? 0 : Math.min(1, forms - 1);
  return 0; // в кыргызском существительное после числа не изменяется
}

/** Набор функций перевода и форматирования для выбранного языка (используется и на сервере, и в браузере). */
export function createI18n(locale: Locale) {
  const dict = DICTS[locale];
  const intl = INTL[locale];

  /** Перевод фразы; {name} — подстановки. */
  const L = (ru: string, vars?: Vars) => fill(dict[ru] ?? ru, vars);

  /** Число + слово в нужной форме: Lp(3, "день", "дня", "дней") → «3 дня» / «3 days» / «3 күн». */
  const Lp = (n: number, one: string, few: string, many: string) => {
    const key = `${one}|${few}|${many}`;
    const forms = (locale === "ru" ? key : dict[key] ?? key).split("|");
    return `${num(n)} ${forms[Math.min(pluralIndex(locale, n, forms.length), forms.length - 1)]}`;
  };

  const numberFmt = new Intl.NumberFormat(intl, { maximumFractionDigits: 0 });
  const num = (v: number) => numberFmt.format(v);
  const som = (v: number) => `${num(v)} ${L("сом")}`;

  const parse = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);

  // Кыргызских шаблонов дат нет в ICU браузеров и Node (Intl подставляет русские), поэтому формат собран вручную:
  // «10-июль, 2027-ж.», «10-июл, 14:49».
  const kyMonth = (m: number, short = false) => (short ? KY_MONTHS[m - 1].slice(0, 3) : KY_MONTHS[m - 1]);
  const date = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) => {
    const d = parse(iso);
    if (locale !== "ky") return d.toLocaleDateString(intl, opts);
    const parts = [`${d.getDate()}-${kyMonth(d.getMonth() + 1, opts.month === "short")}`];
    if (opts.year) parts.push(`${d.getFullYear()}-ж.`);
    return parts.join(", ");
  };
  const dateTime = (iso: string) => {
    const d = parse(iso);
    if (locale !== "ky") return d.toLocaleString(intl, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    return `${d.getDate()}-${kyMonth(d.getMonth() + 1, true)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const monthName = (m: number, style: "long" | "short" = "long") =>
    locale === "ky" ? kyMonth(m, style === "short") : new Date(2026, m - 1, 1).toLocaleDateString(intl, { month: style });
  const season = (from: number, to: number) => (from === 1 && to === 12 ? L("Круглый год") : `${monthName(from, "short")} — ${monthName(to, "short")}`);
  const days = (n: number) => Lp(n, "день", "дня", "дней");

  return { locale, L, Lp, num, som, date, dateTime, monthName, season, days };
}

export type I18n = ReturnType<typeof createI18n>;
