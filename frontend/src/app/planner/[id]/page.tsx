import type { Metadata } from "next";
import { RequireRole } from "@/components/auth/RequireRole";
import { RouteBuilder } from "@/components/planner/RouteBuilder";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return { title: L("Конструктор маршрута"), robots: { index: false } };
}

export default async function RouteBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireRole role="Tourist">
      <RouteBuilder id={id} />
    </RequireRole>
  );
}
