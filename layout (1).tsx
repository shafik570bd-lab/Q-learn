import type { ReactNode } from "react";
import AppShell from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("teacher");
  return (
    <AppShell user={user} role="teacher">
      {children}
    </AppShell>
  );
}
