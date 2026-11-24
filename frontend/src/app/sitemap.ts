import type { MetadataRoute } from "next";
import { apiGet } from "@/lib/api-server";
import { SITE_URL } from "@/lib/format";
import type { ArticleCard, Category, DestinationCard, Paged, PoiCard, TourCard } from "@/lib/types";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const u = (p: string) => `${SITE_URL}${p}`;
  const staticPages = ["", "/destinations", "/tours", "/categories", "/map", "/journal", "/planner"].map((p) => ({ url: u(p) }));
  try {
    const [d, p, t, a, c] = await Promise.all([
      apiGet<DestinationCard[]>("/destinations"),
      apiGet<PoiCard[]>("/poi"),
      apiGet<Paged<TourCard>>("/tours?pageSize=48"),
      apiGet<Paged<ArticleCard>>("/articles?pageSize=48"),
      apiGet<Category[]>("/categories"),
    ]);
    return [
      ...staticPages,
      ...(d ?? []).map((x) => ({ url: u(`/destinations/${x.slug}`) })),
      ...(p ?? []).map((x) => ({ url: u(`/attractions/${x.slug}`) })),
      ...(t?.items ?? []).map((x) => ({ url: u(`/tours/${x.slug}`) })),
      ...(a?.items ?? []).map((x) => ({ url: u(`/journal/${x.slug}`), lastModified: x.publishedAt })),
      ...(c ?? []).map((x) => ({ url: u(`/categories/${x.slug}`) })),
    ];
  } catch {
    return staticPages;
  }
}
