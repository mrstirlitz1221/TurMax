/** Переход между страницами: шаблон пересоздаётся при каждой навигации, содержимое мягко проявляется. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
