import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDb, type Env } from "../db";
import { progressEntries } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { nanoid } from "../utils/id";
import { now } from "../utils/time";

const router = new Hono<{ Bindings: Env }>();
router.use("*", authMiddleware);

// GET /api/progress — all entries for user
router.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb(c.env);
  const entries = await db
    .select()
    .from(progressEntries)
    .where(eq(progressEntries.userId, userId))
    .orderBy(desc(progressEntries.date));
  return c.json({ ok: true, data: entries });
});

// POST /api/progress — add entry
const AddEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().positive(),
  bodyFat: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().optional(),
});

router.post("/", zValidator("json", AddEntrySchema), async (c) => {
  const userId = c.get("userId") as string;
  const body = c.req.valid("json");
  const db = getDb(c.env);
  const entry = { id: nanoid(), userId, ...body, bodyFat: body.bodyFat ?? null, notes: body.notes ?? null, createdAt: now() };
  await db.insert(progressEntries).values(entry);
  return c.json({ ok: true, data: entry }, 201);
});

// DELETE /api/progress/:id
router.delete("/:id", async (c) => {
  const userId = c.get("userId") as string;
  const id = c.req.param("id");
  const db = getDb(c.env);
  await db.delete(progressEntries).where(and(eq(progressEntries.id, id), eq(progressEntries.userId, userId)));
  return c.json({ ok: true });
});

export { router as progressRoutes };
