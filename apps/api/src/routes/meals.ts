import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb, type Env } from "../db";
import { mealLogs } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../utils/id";
import { now } from "../utils/time";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

// GET /api/meals?date=YYYY-MM-DD
router.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const date = c.req.query("date") || new Date().toISOString().slice(0, 10);
  const db = getDb(c.env);
  const entries = await db
    .select()
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, userId), eq(mealLogs.date, date)));
  return c.json({ ok: true, data: entries });
});

// POST /api/meals — mark/unmark a meal
const MealUpsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.number().min(0).max(6),
  mealIndex: z.number().min(0),
  eaten: z.boolean(),
  eatenAt: z.string().nullable().optional(),
});

router.post("/", zValidator("json", MealUpsertSchema), async (c) => {
  const userId = c.get("userId") as string;
  const body = c.req.valid("json");
  const db = getDb(c.env);
  const existing = await db
    .select()
    .from(mealLogs)
    .where(and(
      eq(mealLogs.userId, userId),
      eq(mealLogs.date, body.date),
      eq(mealLogs.mealIndex, body.mealIndex)
    ))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(mealLogs)
      .set({ eaten: body.eaten, eatenAt: body.eatenAt ?? null, updatedAt: now() })
      .where(eq(mealLogs.id, existing[0].id));
    return c.json({ ok: true, data: { ...existing[0], ...body } });
  }
  const entry = {
    id: nanoid(),
    userId,
    ...body,
    eatenAt: body.eatenAt ?? null,
    createdAt: now(),
    updatedAt: now(),
  };
  await db.insert(mealLogs).values(entry);
  return c.json({ ok: true, data: entry }, 201);
});

// DELETE /api/meals/:date — clear all meals for a date
router.delete("/:date", async (c) => {
  const userId = c.get("userId") as string;
  const date = c.req.param("date");
  const db = getDb(c.env);
  await db.delete(mealLogs).where(and(eq(mealLogs.userId, userId), eq(mealLogs.date, date)));
  return c.json({ ok: true });
});

export { router as mealRoutes };
