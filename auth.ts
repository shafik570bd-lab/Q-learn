import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const SECRET = process.env.AUTH_SECRET || "coaching-manager-dev-secret-2026";
export const SESSION_COOKIE = "academy_session";

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const h = crypto.scryptSync(pw, salt, 32);
  const b = Buffer.from(hash, "hex");
  return h.length === b.length && crypto.timingSafeEqual(h, b);
}

type SessionPayload = { uid: number; role: string; exp: number };

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createSessionToken(uid: number, role: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid, role, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (sign(payload) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.uid || !data?.exp || data.exp < Date.now()) return null;
    return data as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export type SessionUser = {
  id: number;
  name: string;
  nameBn: string;
  email: string;
  role: string;
  phone: string;
  subject: string;
  designation: string;
  avatarColor: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await getSession();
  if (!s) return null;
  const [u] = await db.select().from(users).where(eq(users.id, s.uid)).limit(1);
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    nameBn: u.nameBn,
    email: u.email,
    role: u.role,
    phone: u.phone,
    subject: u.subject,
    designation: u.designation,
    avatarColor: u.avatarColor,
  };
}

/** Server-component guard: requires one of the roles, else redirects to /login */
export async function requireRole(role: "admin" | "teacher" | "student") {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/${role === "admin" ? "admin" : role}`);
  if (user.role !== role) redirect("/");
  return user;
}

/** API guard: returns the user or null (caller returns 401/403) */
export async function apiUser(...roles: Array<"admin" | "teacher" | "student">) {
  const user = await getSessionUser();
  if (!user) return { user: null, error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  if (roles.length && !roles.includes(user.role as never)) {
    return { user: null, error: Response.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}
