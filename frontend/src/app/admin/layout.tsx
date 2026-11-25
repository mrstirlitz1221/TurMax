import type { Metadata } from "next";
import { RequireRole } from "@/components/auth/RequireRole";
import { AdminShell } from "@/components/admin/AdminShell";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return { title: L("Администрирование"), robots: { index: false } };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="Admin">
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
