import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { L } = await getI18n();
  return (
    <section className="container-x flex min-h-[80svh] flex-col items-start justify-center pt-[var(--header-h)]">
      <p className="eyebrow text-turquoise">{L("Ошибка 404")}</p>
      <h1 className="h-display mt-3 text-[48px] text-forest sm:text-[72px]">{L("Эта тропа никуда не ведёт")}</h1>
      <p className="mt-4 max-w-lg text-[17px] text-stone">{L("Страница не найдена или была перемещена. Вернитесь на главную или посмотрите направления.")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">{L("На главную")}</Link>
        <Link href="/destinations" className="btn-outline">{L("Направления")}</Link>
      </div>
    </section>
  );
}
