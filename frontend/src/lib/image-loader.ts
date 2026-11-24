// Загрузчик изображений для next/image.
// Фотографии Wikimedia Commons хранятся в БД как ссылки на миниатюры вида .../1920px-File.jpg —
// подставляем ширину из стандартного набора размеров, не превышая исходную.
// Загруженные через админку файлы (/uploads/...) отдаются как есть.
const BUCKETS = [330, 500, 960, 1280, 1920];

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  const m = src.match(/\/(\d+)px-[^/]+$/);
  if (src.includes("wikimedia.org") && m) {
    const max = Number(m[1]);
    const target = BUCKETS.find((b) => b >= width && b <= max) ?? BUCKETS.filter((b) => b <= max).at(-1) ?? max;
    return src.replace(/\/\d+px-([^/]+)$/, `/${target}px-$1`);
  }
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}w=${width}`;
}
