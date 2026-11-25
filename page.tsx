import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");
  if (user.role === "teacher") redirect("/teacher");
  redirect("/student");
}
