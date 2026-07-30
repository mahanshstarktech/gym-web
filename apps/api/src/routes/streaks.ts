import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, type Env } from "../db";
import { streaks } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../utils/id";
import { now } from "../utils/time";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

// GET /api/streaks
router.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb(c.env);
  const [streak] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
  return c.json({ ok: true, data: streak ?? { current: 0, best: 0, lastCompletedDay: null } });
});

// PUT /api/streaks
const StreakUpdateSchema = z.object({
  current: z.number().min(0),
  best: z.number().min(0),
  lastCompletedDay: z.string().nullable(),
});

router.put("/", zValidator("json", StreakUpdateSchema), async (c) => {
  const userId = c.get("userId") as string;
  const body = c.req.valid("json");
  const db = getDb(c.env);
  const [existing] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);

  if (existing) {
    await db.update(streaks).set({ ...body, updatedAt: now() }).where(eq(streaks.id, existing.id));
  } else {
    await db.insert(streaks).values({ id: nanoid(), userId, ...body, updatedAt: now() });
  }
  return c.json({ ok: true, data: body });
});

export { router as streakRoutes };
