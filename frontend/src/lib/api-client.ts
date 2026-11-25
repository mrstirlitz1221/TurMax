"use client";

import type { ApiError, AuthResponse } from "./types";

// Клиент API для браузера: относительные адреса /api/* (прокси Next.js), access-токен в памяти,
// refresh-токен — в HttpOnly-cookie. При 401 один раз пытаемся обновить токен.

let accessToken: string | null = null;
let apiLocale = "ru";

/** Язык запросов к API (задаётся I18nProvider): сервер переводит контент и сообщения об ошибках. */
export function setApiLocale(l: string) {
  apiLocale = l;
}
let refreshing: Promise<AuthResponse | null> | null = null;
type Listener = (auth: AuthResponse | null) => void;
const listeners = new Set<Listener>();

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function onAuthChange(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: Record<string, string[]> | null) {
    super(message);
  }
}

export async function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin", headers: { "X-Lang": apiLocale } })
      .then(async (r) => (r.status === 200 ? ((await r.json()) as AuthResponse) : null))
      .catch(() => null)
      .then((auth) => {
        accessToken = auth?.accessToken ?? null;
        listeners.forEach((l) => l(auth));
        return auth;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

type Options = { method?: string; body?: unknown; form?: FormData; retry?: boolean };

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", "X-Lang": apiLocale };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      credentials: "same-origin",
    });
  } catch {
    throw new HttpError(0, "Нет соединения с сервером. Проверьте подключение к интернету.");
  }

  if (res.status === 401 && opts.retry !== false && !path.startsWith("/auth/")) {
    const auth = await refreshSession();
    if (auth) return api<T>(path, { ...opts, retry: false });
  }
  if (!res.ok) {
    let err: Partial<ApiError> = {};
    try {
      err = await res.json();
    } catch {
      /* тело ответа не JSON */
    }
    throw new HttpError(res.status, err.message ?? `Ошибка ${res.status}`, err.details);
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get("content-type") ?? "";
  return (type.includes("json") ? await res.json() : await res.blob()) as T;
}

/** Скачивание файла (экспорт PDF/GPX) с авторизацией. */
export async function download(path: string, filename: string) {
  const blob = await api<Blob>(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Неизвестная ошибка";
}
