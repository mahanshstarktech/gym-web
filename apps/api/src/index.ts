import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { type Env } from "./db";
import { authRoutes } from "./routes/auth";
import { mealRoutes } from "./routes/meals";
import { workoutRoutes } from "./routes/workouts";
import { waterRoutes } from "./routes/water";
import { progressRoutes } from "./routes/progress";
import { streakRoutes } from "./routes/streaks";
import { profileRoutes } from "./routes/profile";
import { measurementRoutes } from "./routes/measurements";
import { syncRoutes } from "./routes/sync";
import { aiRoutes } from "./routes/ai";
import { notificationRoutes } from "./routes/notifications";
import { getDb } from "./db";
import { pushSubscriptions, profiles } from "./db/schema";
import webpush from "web-push";
import { eq } from "drizzle-orm";

const app = new Hono<{ Bindings: Env }>();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: (origin, c) => {
      if (!origin) return c.env.CORS_ORIGIN || "*";
      if (origin.includes("localhost") || origin.endsWith(".pages.dev")) return origin;
      return c.env.CORS_ORIGIN || "*";
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    credentials: true,
    maxAge: 86400,
  })
);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/", (c) => c.json({ ok: true, service: "lean-protocol-api", version: "1.0.0" }));
app.get("/health", (c) => c.json({ ok: true, timestamp: new Date().toISOString() }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.route("/api/auth", authRoutes);
app.route("/api/meals", mealRoutes);
app.route("/api/workouts", workoutRoutes);
app.route("/api/water", waterRoutes);
app.route("/api/progress", progressRoutes);
app.route("/api/streaks", streakRoutes);
app.route("/api/profile", profileRoutes);
app.route("/api/measurements", measurementRoutes);
app.route("/api/sync", syncRoutes);
app.route("/api/ai", aiRoutes);
app.route("/api/notifications", notificationRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ ok: false, error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ ok: false, error: "Internal server error" }, 500);
});

// ─── CRON Scheduled Event ─────────────────────────────────────────────────────
async function handleScheduled(env: Env) {
  try {
    const db = getDb(env);
    
    // Set VAPID details
    webpush.setVapidDetails(
      "mailto:hello@leanprotocol.app",
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );

    // Fetch all push subscriptions
    const subs = await db.select().from(pushSubscriptions);
    if (subs.length === 0) return;

    // In a real app, we would join with profiles and check meal schedules.
    // For this prototype, we will send a friendly reminder to everyone.
    const payload = JSON.stringify({
      title: "ForgeRX Coach",
      body: "Time to check in! Did you log your meals and hit your water target? 💧",
      icon: "/icons/icon-192.png",
      url: "/meals",
    });

    const promises = subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or invalid, remove it
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error("Push failed for sub", sub.id, err);
        }
      }
    });

    await Promise.all(promises);
    console.log(`Sent notifications to ${subs.length} devices.`);
  } catch (err) {
    console.error("Scheduled task failed:", err);
  }
}

export default {
  fetch: app.fetch,
  scheduled: async (event: any, env: Env, ctx: any) => {
    ctx.waitUntil(handleScheduled(env));
  },
};
