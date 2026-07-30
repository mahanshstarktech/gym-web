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

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ ok: false, error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ ok: false, error: "Internal server error" }, 500);
});

export default app;
