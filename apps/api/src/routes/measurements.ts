import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDb, type Env } from "../db";
import { measurements } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../utils/id";
import { now } from "../utils/time";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

router.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb(c.env);
  const entries = await db.select().from(measurements)
    .where(eq(measurements.userId, userId)).orderBy(desc(measurements.date));
  return c.json({ ok: true, data: entries });
});

const MeasurementSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  chest: z.number().optional(),
  waist: z.number().optional(),
  hips: z.number().optional(),
  leftArm: z.number().optional(),
  rightArm: z.number().optional(),
  leftThigh: z.number().optional(),
  rightThigh: z.number().optional(),
});

router.post("/", zValidator("json", MeasurementSchema), async (c) => {
  const userId = c.get("userId") as string;
  const body = c.req.valid("json");
  const db = getDb(c.env);
  const entry = { id: nanoid(), userId, ...body, createdAt: now() };
  await db.insert(measurements).values(entry);
  return c.json({ ok: true, data: entry }, 201);
});

router.delete("/:id", async (c) => {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  const db = getDb(c.env);
  await db.delete(measurements).where(and(eq(measurements.id, id), eq(measurements.userId, userId)));
  return c.json({ ok: true });
});

export { router as measurementRoutes };
