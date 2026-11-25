import type { Metadata } from "next";
import { RequireRole } from "@/components/auth/RequireRole";
import { AccountShell } from "@/components/account/AccountShell";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { L } = await getI18n();
  return { title: L("Личный кабинет"), robots: { index: false } };
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="Tourist">
      <AccountShell>{children}</AccountShell>
    </RequireRole>
  );
}
