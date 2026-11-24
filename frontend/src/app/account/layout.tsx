import type { Metadata } from "next";
import { RequireRole } from "@/components/auth/RequireRole";
import { AccountShell } from "@/components/account/AccountShell";

export const metadata: Metadata = { title: "Личный кабинет", robots: { index: false } };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="Tourist">
      <AccountShell>{children}</AccountShell>
    </RequireRole>
  );
}
