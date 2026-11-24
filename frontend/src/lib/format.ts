import type { BookingStatus, Difficulty, OperatorKind, PoiKind, RoadType, ServiceType, TourStatus, VehicleType, Verification } from "./types";

const money = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
export const som = (v: number) => `${money.format(v)} сом`;
export const num = (v: number) => money.format(v);

export const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function season(from: number, to: number) {
  if (from === 1 && to === 12) return "Круглый год";
  return `${MONTHS_SHORT[from - 1]} — ${MONTHS_SHORT[to - 1]}`;
}

export function date(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("ru-RU", opts);
}
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
export const days = (n: number) => `${n} ${plural(n, "день", "дня", "дней")}`;

export const DIFFICULTY: Record<Difficulty, string> = { Easy: "Лёгкий", Moderate: "Средний", Hard: "Сложный", Expert: "Экспертный" };
export const DIFFICULTY_LEVEL: Record<Difficulty, number> = { Easy: 1, Moderate: 2, Hard: 3, Expert: 4 };

export const POI_KIND: Record<PoiKind, string> = {
  City: "Город", Lake: "Озеро", Gorge: "Ущелье", Pass: "Перевал", Peak: "Вершина", Monument: "Памятник истории",
  Museum: "Музей", Nature: "Природа", YurtCamp: "Юрточный лагерь", HotSpring: "Горячие источники", Waterfall: "Водопад",
};
export const ROAD: Record<RoadType, string> = { Asphalt: "Асфальт", Gravel: "Гравий", Dirt: "Горная грунтовка" };
export const VEHICLE: Record<VehicleType, string> = { Sedan: "Седан (до 3 чел.)", Minivan: "Минивэн (до 7 чел.)", Bus: "Микроавтобус (до 18 чел.)" };
export const OPERATOR_KIND: Record<OperatorKind, string> = { TourOperator: "Туроператор", Guide: "Гид", GuestHouse: "Гостевой дом", Cbt: "Общинный туризм (CBT)" };
export const VERIFICATION: Record<Verification, string> = { Pending: "На проверке", Verified: "Проверен", Blocked: "Заблокирован" };
export const SERVICE: Record<ServiceType, string> = { Transport: "Транспорт, сом/км", Lodging: "Проживание, сом/чел/ночь", Meals: "Питание, сом/чел/день", Guide: "Гид, сом/день" };
export const TOUR_STATUS: Record<TourStatus, string> = { Draft: "Черновик", Pending: "На модерации", Published: "Опубликован", Rejected: "Отклонён", Hidden: "Скрыт" };
export const LANG: Record<string, string> = { ru: "Русский", en: "English", ky: "Кыргызча" };

export const BOOKING_STATUS: Record<BookingStatus, string> = {
  New: "Новая", InReview: "На рассмотрении", PriceChanged: "Изменена цена", Confirmed: "Подтверждена",
  Rejected: "Отклонена", Cancelled: "Отменена", Completed: "Завершена",
};
export const BOOKING_TONE: Record<BookingStatus, "neutral" | "info" | "warn" | "ok" | "bad"> = {
  New: "info", InReview: "info", PriceChanged: "warn", Confirmed: "ok", Rejected: "bad", Cancelled: "neutral", Completed: "ok",
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
