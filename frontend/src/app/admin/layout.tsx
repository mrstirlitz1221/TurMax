import type { Metadata } from "next";
import { RequireRole } from "@/components/auth/RequireRole";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Администрирование", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="Admin">
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
