import { z } from "zod";

// ─── User ────────────────────────────────────────────────────────────────────
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

// ─── Auth ────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export const RegisterSchema = LoginSchema.extend({
  name: z.string().min(2),
});

// ─── Meal Log ────────────────────────────────────────────────────────────────
export const MealLogEntrySchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  dayOfWeek: z.number().min(0).max(6),
  mealIndex: z.number().min(0),
  eaten: z.boolean(),
  eatenAt: z.string().nullable().optional(), // HH:MM
});
export type MealLogEntry = z.infer<typeof MealLogEntrySchema>;

export const MealLogSchema = z.object({
  date: z.string(),
  entries: z.array(MealLogEntrySchema),
});
export type MealLog = z.infer<typeof MealLogSchema>;

// ─── Progress Entry ───────────────────────────────────────────────────────────
export const ProgressEntrySchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().positive(),
  bodyFat: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().optional(),
});
export type ProgressEntry = z.infer<typeof ProgressEntrySchema>;

// ─── Water Log ───────────────────────────────────────────────────────────────
export const WaterLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  glasses: z.number().min(0).max(20),
  targetGlasses: z.number().default(10),
});
export type WaterLog = z.infer<typeof WaterLogSchema>;

// ─── Workout Log ─────────────────────────────────────────────────────────────
export const WorkoutCheckSchema = z.object({
  id: z.string(),        // e.g. "wk-1-0-2" (day-block-exercise)
  checked: z.boolean(),
});
export const WorkoutLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.number().min(0).max(6),
  checks: z.array(WorkoutCheckSchema),
});
export type WorkoutLog = z.infer<typeof WorkoutLogSchema>;
export type WorkoutCheck = z.infer<typeof WorkoutCheckSchema>;

// ─── Streak ──────────────────────────────────────────────────────────────────
export const StreakSchema = z.object({
  current: z.number().min(0),
  best: z.number().min(0),
  lastCompletedDay: z.string().nullable(),
});
export type Streak = z.infer<typeof StreakSchema>;

// ─── Measurements ────────────────────────────────────────────────────────────
export const MeasurementsSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  chest: z.number().optional(),
  waist: z.number().optional(),
  hips: z.number().optional(),
  leftArm: z.number().optional(),
  rightArm: z.number().optional(),
  leftThigh: z.number().optional(),
  rightThigh: z.number().optional(),
});
export type Measurements = z.infer<typeof MeasurementsSchema>;

// ─── User Profile / Settings ─────────────────────────────────────────────────
export const UserProfileSchema = z.object({
  name: z.string(),
  startWeight: z.number().optional(),
  targetWeight: z.number().optional(),
  startBodyFat: z.number().optional(),
  targetBodyFat: z.number().optional(),
  dailyKcalTarget: z.number().default(2180),
  dailyProteinTarget: z.number().default(140),
  dailyWaterTarget: z.number().default(10),
  cycleStartDate: z.string().optional(),
  cycleDurationWeeks: z.number().default(12),
  mealRemindersEnabled: z.boolean().default(false),
  theme: z.enum(["dark", "light", "system"]).default("dark"),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// ─── API Response Envelope ───────────────────────────────────────────────────
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

// ─── Sync Payload (full data export) ─────────────────────────────────────────
export const SyncPayloadSchema = z.object({
  progressEntries: z.array(ProgressEntrySchema),
  mealLogs: z.record(z.string(), z.array(MealLogEntrySchema)),
  workoutLogs: z.record(z.string(), z.array(WorkoutCheckSchema)),
  waterLogs: z.record(z.string(), WaterLogSchema),
  streak: StreakSchema,
  profile: UserProfileSchema.optional(),
  exportedAt: z.string().datetime(),
});
export type SyncPayload = z.infer<typeof SyncPayloadSchema>;

// ─── Constants ───────────────────────────────────────────────────────────────
export const DAYS_OF_WEEK = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as const;
export const DEFAULT_DAILY_KCAL = 2180;
export const DEFAULT_DAILY_PROTEIN = 140;
export const DEFAULT_WATER_GLASSES = 10;
export const CYCLE_DURATION_WEEKS = 12;
