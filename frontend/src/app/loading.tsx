export default function Loading() {
  return (
    <div className="container-x flex min-h-[70svh] items-center justify-center pt-[var(--header-h)]" role="status" aria-label="Загрузка">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-forest/15 border-t-turquoise" />
    </div>
  );
}
