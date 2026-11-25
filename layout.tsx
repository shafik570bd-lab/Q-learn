import type { ReactNode } from "react";
import AppShell from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("admin");
  return (
    <AppShell user={user} role="admin">
      {children}
    </AppShell>
  );
}
