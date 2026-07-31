import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── Sessions (Better Auth) ───────────────────────────────────────────────────
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// ─── User Profiles / Settings ─────────────────────────────────────────────────
export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  dailyKcalTarget: integer("daily_kcal_target").notNull().default(2180),
  dailyProteinTarget: integer("daily_protein_target").notNull().default(140),
  dailyWaterTarget: integer("daily_water_target").notNull().default(10),
  startWeight: real("start_weight"),
  targetWeight: real("target_weight"),
  startBodyFat: real("start_body_fat"),
  targetBodyFat: real("target_body_fat"),
  cycleStartDate: text("cycle_start_date"),
  cycleDurationWeeks: integer("cycle_duration_weeks").notNull().default(12),
  theme: text("theme").notNull().default("dark"),
  mealRemindersEnabled: integer("meal_reminders_enabled", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});

// ─── Progress Entries (weight + body fat logs) ────────────────────────────────
export const progressEntries = sqliteTable("progress_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),  // YYYY-MM-DD
  weight: real("weight").notNull(),
  bodyFat: real("body_fat"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

// ─── Meal Logs ────────────────────────────────────────────────────────────────
export const mealLogs = sqliteTable("meal_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),          // YYYY-MM-DD
  dayOfWeek: integer("day_of_week").notNull(),
  mealIndex: integer("meal_index").notNull(),
  eaten: integer("eaten", { mode: "boolean" }).notNull().default(false),
  eatenAt: text("eaten_at"),             // HH:MM or null
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── Water Logs ───────────────────────────────────────────────────────────────
export const waterLogs = sqliteTable("water_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull().unique(),  // YYYY-MM-DD (one per day per user)
  glasses: integer("glasses").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

// ─── Workout Logs ─────────────────────────────────────────────────────────────
export const workoutLogs = sqliteTable("workout_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),  // YYYY-MM-DD
  checkId: text("check_id").notNull(),  // e.g. "wk-1-0-2"
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull(),
});

// ─── Streaks ──────────────────────────────────────────────────────────────────
export const streaks = sqliteTable("streaks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  current: integer("current").notNull().default(0),
  best: integer("best").notNull().default(0),
  lastCompletedDay: text("last_completed_day"),
  updatedAt: text("updated_at").notNull(),
});

// ─── Body Measurements ────────────────────────────────────────────────────────
export const measurements = sqliteTable("measurements", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  chest: real("chest"),
  waist: real("waist"),
  hips: real("hips"),
  leftArm: real("left_arm"),
  rightArm: real("right_arm"),
  leftThigh: real("left_thigh"),
  rightThigh: real("right_thigh"),
  createdAt: text("created_at").notNull(),
});

// ─── Cloud Sync (Key-Value) ───────────────────────────────────────────────────
// This allows seamless synchronization of the frontend's localStorage PWA state
import { primaryKey } from "drizzle-orm/sqlite-core";

export const kvSync = sqliteTable("kv_sync", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(), // JSON stringified
  updatedAt: text("updated_at").notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.key] })
  }
});

// ─── Push Subscriptions ───────────────────────────────────────────────────────
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").notNull(),
});
