import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb, type Env } from "../db";
import { sessions, users } from "../db/schema";
import type { Context, Next } from "hono";

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const cookie = c.req.header("Cookie") || "";
  const token = cookie.match(/lp_session=([^;]+)/)?.[1];

  if (!token) return c.json({ ok: false, error: "Unauthorized" }, 401);

  const db = getDb(c.env);
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (!session || new Date(session.expiresAt) < new Date()) {
    return c.json({ ok: false, error: "Session expired. Please log in again." }, 401);
  }

  c.set("userId", session.userId);
  await next();
}
