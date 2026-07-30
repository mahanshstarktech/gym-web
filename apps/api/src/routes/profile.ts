import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, type Env } from "../db";
import { profiles } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../utils/id";
import { now } from "../utils/time";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

router.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb(c.env);
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return c.json({ ok: true, data: profile ?? null });
});

const ProfileSchema = z.object({
  dailyKcalTarget: z.number().optional(),
  dailyProteinTarget: z.number().optional(),
  dailyWaterTarget: z.number().optional(),
  startWeight: z.number().optional(),
  targetWeight: z.number().optional(),
  startBodyFat: z.number().optional(),
  targetBodyFat: z.number().optional(),
  cycleStartDate: z.string().optional(),
  cycleDurationWeeks: z.number().optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  mealRemindersEnabled: z.boolean().optional(),
});

router.put("/", zValidator("json", ProfileSchema), async (c) => {
  const userId = c.get("userId") as string;
  const body = c.req.valid("json");
  const db = getDb(c.env);
  const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);

  if (existing) {
    await db.update(profiles).set({ ...body, updatedAt: now() }).where(eq(profiles.userId, userId));
  } else {
    await db.insert(profiles).values({ id: nanoid(), userId, ...body, updatedAt: now() });
  }
  return c.json({ ok: true });
});

export { router as profileRoutes };
