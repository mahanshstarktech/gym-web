import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb, type Env } from "../db";
import { workoutLogs } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../utils/id";
import { now } from "../utils/time";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

// GET /api/workouts?date=YYYY-MM-DD
router.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const date = c.req.query("date") || new Date().toISOString().slice(0, 10);
  const db = getDb(c.env);
  const entries = await db.select().from(workoutLogs)
    .where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.date, date)));
  return c.json({ ok: true, data: entries });
});

// POST /api/workouts — toggle a check
const CheckSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.number().min(0).max(6),
  checkId: z.string(),
  checked: z.boolean(),
});

router.post("/", zValidator("json", CheckSchema), async (c) => {
  const userId = c.get("userId") as string;
  const body = c.req.valid("json");
  const db = getDb(c.env);
  const [existing] = await db.select().from(workoutLogs)
    .where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.date, body.date), eq(workoutLogs.checkId, body.checkId)))
    .limit(1);

  if (existing) {
    await db.update(workoutLogs).set({ checked: body.checked, updatedAt: now() }).where(eq(workoutLogs.id, existing.id));
  } else {
    await db.insert(workoutLogs).values({ id: nanoid(), userId, ...body, updatedAt: now() });
  }
  return c.json({ ok: true });
});

export { router as workoutRoutes };
