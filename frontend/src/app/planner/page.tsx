import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { PlannerHome } from "@/components/planner/PlannerHome";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return { title: L("Конструктор маршрута"), robots: { index: false } };
}

export default function PlannerPage() {
  return (
    <RequireRole role="Tourist">
      <Suspense>
        <PlannerHome />
      </Suspense>
    </RequireRole>
  );
}
