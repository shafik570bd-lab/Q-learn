import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  apiUser, createSessionToken, verifyPassword, SESSION_COOKIE,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user } = await apiUser();
  if (!user) return Response.json({ user: null }, { status: 401 });
  return Response.json({ user });
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "অনুরোধটি সঠিক নয়" }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  if (!email || !password) {
    return Response.json({ error: "ইমেইল ও পাসওয়ার্ড দিন" }, { status: 400 });
  }
  const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!u || !verifyPassword(password, u.passwordHash)) {
    return Response.json({ error: "ইমেইল বা পাসওয়ার্ড ভুল হয়েছে" }, { status: 401 });
  }
  const res = Response.json({
    user: {
      id: u.id, name: u.name, nameBn: u.nameBn, email: u.email, role: u.role,
      phone: u.phone, subject: u.subject, designation: u.designation, avatarColor: u.avatarColor,
    },
  });
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${createSessionToken(u.id, u.role)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
  );
  return res;
}

export async function DELETE() {
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return res;
}
