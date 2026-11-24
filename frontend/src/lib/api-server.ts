import "server-only";

// Запросы к API из серверных компонентов (SSR). Публичные данные кешируются на минуту.
const BASE = process.env.API_INTERNAL_URL ?? "http://localhost:5199";

export class ApiUnavailableError extends Error {}

export async function apiGet<T>(path: string, revalidate = 60): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, { next: { revalidate }, headers: { Accept: "application/json" } });
  } catch {
    throw new ApiUnavailableError("Сервер TurMax API недоступен. Проверьте, что backend запущен.");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiUnavailableError(`Ошибка API ${res.status} при запросе ${path}`);
  return (await res.json()) as T;
}

/** То же, но для обязательных данных: пустой ответ трактуется как ошибка. */
export async function apiGetRequired<T>(path: string, revalidate = 60): Promise<T> {
  const data = await apiGet<T>(path, revalidate);
  if (data === null) throw new ApiUnavailableError(`Ресурс ${path} не найден`);
  return data;
}
