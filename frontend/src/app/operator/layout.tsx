import type { Metadata } from "next";
import { RequireRole } from "@/components/auth/RequireRole";
import { OperatorShell } from "@/components/operator/OperatorShell";

export const metadata: Metadata = { title: "Кабинет оператора", robots: { index: false } };

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="Operator">
      <OperatorShell>{children}</OperatorShell>
    </RequireRole>
  );
}
