import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-x flex min-h-[80svh] flex-col items-start justify-center pt-[var(--header-h)]">
      <p className="eyebrow text-turquoise">Ошибка 404</p>
      <h1 className="h-display mt-3 text-[48px] text-forest sm:text-[72px]">Эта тропа никуда не ведёт</h1>
      <p className="mt-4 max-w-lg text-[17px] text-stone">Страница не найдена или была перемещена. Вернитесь на главную или посмотрите направления.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="btn-primary">На главную</Link>
        <Link href="/destinations" className="btn-outline">Направления</Link>
      </div>
    </section>
  );
}
