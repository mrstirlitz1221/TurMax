import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./config";
import { createI18n } from "./core";

/** Язык текущего запроса из cookie (выбранный пользователем или сохранённый в профиле). */
export const getLocale = cache(async (): Promise<Locale> => normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value));

/** Функции перевода для серверных компонентов. */
export const getI18n = cache(async () => createI18n(await getLocale()));
