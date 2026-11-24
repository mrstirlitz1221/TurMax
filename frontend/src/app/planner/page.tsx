import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { PlannerHome } from "@/components/planner/PlannerHome";

export const metadata: Metadata = { title: "Конструктор маршрута", robots: { index: false } };

export default function PlannerPage() {
  return (
    <RequireRole role="Tourist">
      <Suspense>
        <PlannerHome />
      </Suspense>
    </RequireRole>
  );
}
