import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, type Env } from "../db";
import { users, sessions, profiles } from "../db/schema";
import { nanoid } from "../utils/id";
import { now } from "../utils/time";
import { hashPassword, verifyPassword } from "../utils/crypto";

const router = new Hono<{ Bindings: Env }>();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/register
router.post("/register", zValidator("json", RegisterSchema), async (c) => {
  const { email, password, name } = c.req.valid("json");
  const db = getDb(c.env);

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return c.json({ ok: false, error: "Email already registered" }, 409);

  const passwordHash = await hashPassword(password);
  const userId = nanoid();
  const t = now();

  await db.insert(users).values({ id: userId, email, name, passwordHash, createdAt: t, updatedAt: t });
  await db.insert(profiles).values({ id: nanoid(), userId, updatedAt: t });

  const sessionToken = nanoid(64);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.insert(sessions).values({ id: nanoid(), userId, token: sessionToken, expiresAt, createdAt: t });

  const isProd = c.req.url.startsWith("https");
  const cookieStr = `lp_session=${sessionToken}; HttpOnly; Path=/; Expires=${new Date(expiresAt).toUTCString()}${isProd ? "; Secure; SameSite=None" : "; SameSite=Lax"}`;
  c.header("Set-Cookie", cookieStr);
  return c.json({ ok: true, data: { id: userId, email, name, token: sessionToken } }, 201);
});

// POST /api/auth/login
router.post("/login", zValidator("json", LoginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = getDb(c.env);

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return c.json({ ok: false, error: "Invalid credentials" }, 401);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return c.json({ ok: false, error: "Invalid credentials" }, 401);

  const sessionToken = nanoid(64);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db.insert(sessions).values({ id: nanoid(), userId: user.id, token: sessionToken, expiresAt, createdAt: now() });

  const isProd = c.req.url.startsWith("https");
  const cookieStr = `lp_session=${sessionToken}; HttpOnly; Path=/; Expires=${new Date(expiresAt).toUTCString()}${isProd ? "; Secure; SameSite=None" : "; SameSite=Lax"}`;
  c.header("Set-Cookie", cookieStr);
  return c.json({ ok: true, data: { id: user.id, email: user.email, name: user.name, token: sessionToken } });
});

// POST /api/auth/logout
router.post("/logout", async (c) => {
  const cookie = c.req.header("Cookie") || "";
  const token = cookie.match(/lp_session=([^;]+)/)?.[1];
  if (token) {
    const db = getDb(c.env);
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  const isProd = c.req.url.startsWith("https");
  const cookieStr = `lp_session=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT${isProd ? "; Secure; SameSite=None" : "; SameSite=Lax"}`;
  c.header("Set-Cookie", cookieStr);
  return c.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", async (c) => {
  const cookie = c.req.header("Cookie") || "";
  let token = cookie.match(/lp_session=([^;]+)/)?.[1];
  
  if (!token) {
    const authHeader = c.req.header("Authorization") || "";
    token = authHeader.replace("Bearer ", "").trim();
  }

  if (!token) return c.json({ ok: false, error: "Unauthorized" }, 401);

  const db = getDb(c.env);
  const [session] = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return c.json({ ok: false, error: "Session expired" }, 401);

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return c.json({ ok: false, error: "User not found" }, 404);

  return c.json({ ok: true, data: { id: user.id, email: user.email, name: user.name } });
});

export { router as authRoutes };
