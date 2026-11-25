import type { Metadata } from "next";
import { RequireRole } from "@/components/auth/RequireRole";
import { OperatorShell } from "@/components/operator/OperatorShell";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return { title: L("Кабинет оператора"), robots: { index: false } };
}

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="Operator">
      <OperatorShell>{children}</OperatorShell>
    </RequireRole>
  );
}
