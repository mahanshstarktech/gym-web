import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { getDb, type Env } from "../db";
import { progressEntries, mealLogs, workoutLogs, waterLogs, streaks, kvSync } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { now } from "../utils/time";
import { nanoid } from "../utils/id";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

// GET /api/sync/kv — Get all KV state for the user
router.get("/kv", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb(c.env);

  const records = await db.select().from(kvSync).where(eq(kvSync.userId, userId));
  
  const state: Record<string, any> = {};
  for (const r of records) {
    try {
      state[r.key] = JSON.parse(r.value);
    } catch {
      state[r.key] = r.value; // fallback
    }
  }

  return c.json({ ok: true, data: state });
});

// POST /api/sync/kv — Push KV state updates
router.post("/kv", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const db = getDb(c.env);
  const t = now();

  if (!body.updates || typeof body.updates !== "object") {
    return c.json({ ok: false, error: "Invalid updates payload" }, 400);
  }

  // Use a transaction or batch to insert/update keys
  for (const [key, value] of Object.entries(body.updates)) {
    if (value === null) {
      // Delete key if value is null
      await db.delete(kvSync).where(and(eq(kvSync.userId, userId), eq(kvSync.key, key)));
    } else {
      const valStr = JSON.stringify(value);
      await db.insert(kvSync)
        .values({ userId, key, value: valStr, updatedAt: t })
        .onConflictDoUpdate({
          target: [kvSync.userId, kvSync.key],
          set: { value: valStr, updatedAt: t }
        });
    }
  }

  return c.json({ ok: true, message: "Sync successful", timestamp: t });
});

export { router as syncRoutes };
