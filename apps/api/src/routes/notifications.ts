import { Hono } from "hono";
import { type Env } from "../db";
import { pushSubscriptions } from "../db/schema";
import { getDb } from "../db";
import { eq } from "drizzle-orm";

export const notificationRoutes = new Hono<{ Bindings: Env }>();

// This would ideally have auth middleware, but we'll keep it simple for now
notificationRoutes.post("/subscribe", async (c) => {
  try {
    const body = await c.req.json();
    const { userId, endpoint, keys } = body;
    
    if (!userId || !endpoint || !keys) {
      return c.json({ ok: false, error: "Invalid subscription" }, 400);
    }

    const db = getDb(c.env);

    await db.insert(pushSubscriptions).values({
      id: crypto.randomUUID(),
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      createdAt: new Date().toISOString(),
    });

    return c.json({ ok: true });
  } catch (err: any) {
    console.error("Push subscription error:", err);
    return c.json({ ok: false, error: "Failed to save subscription" }, 500);
  }
});
