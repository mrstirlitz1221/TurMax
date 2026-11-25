"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { L } = useI18n();
  return (
    <section className="container-x flex min-h-[80svh] flex-col items-start justify-center pt-[var(--header-h)]">
      <p className="eyebrow text-clay">{L("Что-то пошло не так")}</p>
      <h1 className="h-display mt-3 text-[44px] text-forest sm:text-[60px]">{L("Не удалось загрузить страницу")}</h1>
      <p className="mt-4 max-w-lg text-[17px] text-stone">
        {error.message?.includes("API") ? error.message : L("Сервер временно недоступен. Попробуйте обновить страницу через минуту.")}
      </p>
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="btn-primary">{L("Попробовать снова")}</button>
        <Link href="/" className="btn-outline">{L("На главную")}</Link>
      </div>
    </section>
  );
}
