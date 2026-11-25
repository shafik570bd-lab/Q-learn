import type { ReactNode } from "react";
import AppShell from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("student");
  return (
    <AppShell user={user} role="student">
      {children}
    </AppShell>
  );
}
