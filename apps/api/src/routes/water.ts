import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb, type Env } from "../db";
import { waterLogs } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../utils/id";
import { now } from "../utils/time";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

// GET /api/water?date=YYYY-MM-DD
router.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const date = c.req.query("date") || new Date().toISOString().slice(0, 10);
  const db = getDb(c.env);
  const [entry] = await db.select().from(waterLogs)
    .where(and(eq(waterLogs.userId, userId), eq(waterLogs.date, date))).limit(1);
  return c.json({ ok: true, data: entry ?? { date, glasses: 0 } });
});

// PUT /api/water — upsert glasses count
const WaterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  glasses: z.number().min(0).max(20),
});

router.put("/", zValidator("json", WaterSchema), async (c) => {
  const userId = c.get("userId") as string;
  const { date, glasses } = c.req.valid("json");
  const db = getDb(c.env);
  const [existing] = await db.select().from(waterLogs)
    .where(and(eq(waterLogs.userId, userId), eq(waterLogs.date, date))).limit(1);

  if (existing) {
    await db.update(waterLogs).set({ glasses, updatedAt: now() }).where(eq(waterLogs.id, existing.id));
  } else {
    await db.insert(waterLogs).values({ id: nanoid(), userId, date, glasses, updatedAt: now() });
  }
  return c.json({ ok: true, data: { date, glasses } });
});

export { router as waterRoutes };
