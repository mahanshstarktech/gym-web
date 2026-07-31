// ============================================================
// Stats Engine — reads all localStorage workout & food log data
// and computes advanced analytics
// ============================================================

import { formatMs, computeStats, getSessionGrade, type WorkoutSession, type SessionStats } from "@/lib/workout-session";
import { WORKOUT_DAYS, MEAL_DAYS, parseMacros, DAILY_KCAL, DAILY_PROTEIN } from "@/lib/data";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WorkoutHistoryEntry {
  key: string;
  date: string; // YYYY-MM-DD
  dayIndex: number;
  session: WorkoutSession;
  stats: SessionStats;
  grade: string;
  gradeColor: string;
  gradeDesc: string;
  dayName: string;
  focus: string;
}

export interface FoodLogEntry {
  date: string; // YYYY-MM-DD
  totalKcal: number;
  totalProtein: number;
  mealsLogged: number;
  totalMeals: number;
  mealTimes: string[]; // HH:MM of each logged meal
}

export interface WorkoutAggregate {
  totalSessions: number;
  totalSetsLogged: number;
  totalActiveTimeMs: number;
  totalRestTimeMs: number;
  avgDurationMs: number;
  avgEfficiency: number;
  avgSetsPerSession: number;
  avgRestExtensions: number;
  currentStreak: number;
  longestStreak: number;
  muscleGroupCounts: Record<string, number>;
  weeklyVolume: { week: string; sessions: number; sets: number }[];
  fatigueBySession: { date: string; avgSetMs: number; focus: string }[];
  gradeDistribution: Record<string, number>;
  bestSession: WorkoutHistoryEntry | null;
}

export interface NutritionAggregate {
  totalDaysLogged: number;
  avgDailyKcal: number;
  avgDailyProtein: number;
  kcalAdherenceRate: number; // % days within ±200 kcal of target
  proteinHitRate: number; // % days hitting 140g+
  mealCompletionRate: number; // % of meals logged on time
  calorieHistory: { date: string; kcal: number; protein: number }[];
  mealSkipCounts: Record<string, number>; // label → skip count
  suggestions: string[];
  risks: string[];
  wins: string[];
  avgEatingWindowHours: number;
  lateNightEatingDays: number;
}

// ── Load all workout sessions ──────────────────────────────────────────────────

export function loadAllWorkoutSessions(): WorkoutHistoryEntry[] {
  const sessions: WorkoutHistoryEntry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("lp_workout_")) continue;
      // key format: lp_workout_YYYY-MM-DD_dN
      const match = key.match(/lp_workout_(\d{4}-\d{2}-\d{2})_d(\d)/);
      if (!match) continue;
      const date = match[1];
      const dayIndex = parseInt(match[2]);
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const session = JSON.parse(raw) as WorkoutSession;
      if (!session.endedAt) continue; // skip incomplete
      const stats = computeStats(session);
      const { grade, color, desc } = getGradeFromStats(stats);
      const day = WORKOUT_DAYS[dayIndex];
      sessions.push({
        key, date, dayIndex, session, stats,
        grade, gradeColor: color, gradeDesc: desc,
        dayName: day?.name ?? "Day",
        focus: day?.focus ?? "",
      });
    }
  } catch {}
  return sessions.sort((a, b) => b.date.localeCompare(a.date));
}

function getGradeFromStats(stats: SessionStats): { grade: string; color: string; desc: string } {
  const comp = stats.setsTotal > 0 ? stats.setsDone / stats.setsTotal : 0;
  if (comp >= 1.0 && stats.efficiencyPct >= 85 && stats.restExtensions < 3) return { grade: "S", color: "var(--turmeric)", desc: "Perfect" };
  if (comp >= 0.9 && stats.efficiencyPct >= 72) return { grade: "A", color: "#4ade80", desc: "Excellent" };
  if (comp >= 0.75 && stats.efficiencyPct >= 58) return { grade: "B", color: "#60a5fa", desc: "Solid" };
  if (comp >= 0.5) return { grade: "C", color: "#9ca3af", desc: "Good Effort" };
  return { grade: "D", color: "var(--paprika)", desc: "Keep Pushing" };
}

// ── Load all food logs ─────────────────────────────────────────────────────────

export function loadAllFoodLogs(): FoodLogEntry[] {
  const entries: FoodLogEntry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("lp_food_log_")) continue;
      const match = key.match(/lp_food_log_(\d{4}-\d{2}-\d{2})/);
      if (!match) continue;
      const date = match[1];
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const log = JSON.parse(raw) as Record<string, any>;

      // Determine which day this was
      const d = new Date(date).getDay();
      const dayMeals = MEAL_DAYS[d]?.meals ?? [];
      let totalKcal = 0, totalProtein = 0, mealsLogged = 0;
      const mealTimes: string[] = [];

      dayMeals.forEach((meal, mi) => {
        const state = log[mi];
        if (!state) return;
        const macros = parseMacros(meal.macros);
        const n = meal.items.length;
        if (state.mealEaten) {
          totalKcal += macros.kcal;
          totalProtein += macros.protein;
          mealsLogged++;
          if (state.mealTime) mealTimes.push(state.mealTime);
        } else if (state.itemsEaten) {
          const eaten = Object.values(state.itemsEaten as Record<string, boolean>).filter(Boolean).length;
          const ratio = n > 0 ? eaten / n : 0;
          // Apply qty multiplier if present
          const qtys = state.itemQty as Record<number, number> | undefined;
          if (qtys && eaten > 0) {
            let adjustedRatio = 0;
            for (let ii = 0; ii < n; ii++) {
              if (state.itemsEaten[ii]) adjustedRatio += (qtys[ii] ?? 1) / n;
            }
            totalKcal += macros.kcal * adjustedRatio;
            totalProtein += macros.protein * adjustedRatio;
          } else {
            totalKcal += macros.kcal * ratio;
            totalProtein += macros.protein * ratio;
          }
          if (eaten > 0) mealsLogged++;
          if (state.mealTime) mealTimes.push(state.mealTime);
        }
      });

      entries.push({ date, totalKcal, totalProtein, mealsLogged, totalMeals: dayMeals.length, mealTimes });
    }
  } catch {}
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

// ── Compute workout aggregate ──────────────────────────────────────────────────

export function computeWorkoutAggregate(history: WorkoutHistoryEntry[]): WorkoutAggregate {
  if (history.length === 0) {
    return {
      totalSessions: 0, totalSetsLogged: 0, totalActiveTimeMs: 0, totalRestTimeMs: 0,
      avgDurationMs: 0, avgEfficiency: 0, avgSetsPerSession: 0, avgRestExtensions: 0,
      currentStreak: 0, longestStreak: 0, muscleGroupCounts: {}, weeklyVolume: [],
      fatigueBySession: [], gradeDistribution: {}, bestSession: null,
    };
  }

  let totalSets = 0, totalActiveMs = 0, totalRestMs = 0, totalEff = 0, totalExt = 0;
  const muscleGroupCounts: Record<string, number> = {};
  const gradeDistribution: Record<string, number> = {};
  const weeklyMap: Record<string, { sessions: number; sets: number }> = {};
  const fatigueBySession: { date: string; avgSetMs: number; focus: string }[] = [];
  let bestSession: WorkoutHistoryEntry | null = null;

  for (const entry of history) {
    const { stats } = entry;
    totalSets += stats.setsDone;
    totalActiveMs += stats.elapsedMs - stats.totalRestMs;
    totalRestMs += stats.totalRestMs;
    totalEff += stats.efficiencyPct;
    totalExt += stats.restExtensions;

    // Muscle group
    const focus = entry.focus.toLowerCase();
    if (focus.includes("push")) muscleGroupCounts["Push"] = (muscleGroupCounts["Push"] ?? 0) + 1;
    if (focus.includes("pull")) muscleGroupCounts["Pull"] = (muscleGroupCounts["Pull"] ?? 0) + 1;
    if (focus.includes("leg")) muscleGroupCounts["Legs"] = (muscleGroupCounts["Legs"] ?? 0) + 1;
    if (focus.includes("hiit") || focus.includes("boxing") || focus.includes("cardio") || focus.includes("conditioning"))
      muscleGroupCounts["Cardio"] = (muscleGroupCounts["Cardio"] ?? 0) + 1;
    if (focus.includes("full")) muscleGroupCounts["Full Body"] = (muscleGroupCounts["Full Body"] ?? 0) + 1;

    // Grade
    gradeDistribution[entry.grade] = (gradeDistribution[entry.grade] ?? 0) + 1;

    // Weekly volume
    const weekStart = getWeekStart(entry.date);
    if (!weeklyMap[weekStart]) weeklyMap[weekStart] = { sessions: 0, sets: 0 };
    weeklyMap[weekStart].sessions++;
    weeklyMap[weekStart].sets += stats.setsDone;

    // Fatigue
    fatigueBySession.push({ date: entry.date, avgSetMs: stats.avgSetMs, focus: entry.focus });

    // Best session
    if (!bestSession || (stats.setsDone / Math.max(1, stats.setsTotal)) > (bestSession.stats.setsDone / Math.max(1, bestSession.stats.setsTotal))) {
      bestSession = entry;
    }
  }

  const n = history.length;
  const weeklyVolume = Object.entries(weeklyMap)
    .map(([week, v]) => ({ week, ...v }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8); // last 8 weeks

  // Streaks
  const { current, longest } = computeStreaks(history.map((h) => h.date).reverse());

  return {
    totalSessions: n,
    totalSetsLogged: totalSets,
    totalActiveTimeMs: totalActiveMs,
    totalRestTimeMs: totalRestMs,
    avgDurationMs: history.reduce((a, h) => a + h.stats.elapsedMs, 0) / n,
    avgEfficiency: Math.round(totalEff / n),
    avgSetsPerSession: Math.round(totalSets / n),
    avgRestExtensions: Math.round((totalExt / n) * 10) / 10,
    currentStreak: current,
    longestStreak: longest,
    muscleGroupCounts,
    weeklyVolume,
    fatigueBySession: fatigueBySession.reverse(),
    gradeDistribution,
    bestSession,
  };
}

// ── Compute nutrition aggregate ────────────────────────────────────────────────

export function computeNutritionAggregate(logs: FoodLogEntry[]): NutritionAggregate {
  const suggestions: string[] = [];
  const risks: string[] = [];
  const wins: string[] = [];

  if (logs.length === 0) {
    return {
      totalDaysLogged: 0, avgDailyKcal: 0, avgDailyProtein: 0,
      kcalAdherenceRate: 0, proteinHitRate: 0, mealCompletionRate: 0,
      calorieHistory: [], mealSkipCounts: {}, suggestions, risks, wins,
      avgEatingWindowHours: 0, lateNightEatingDays: 0,
    };
  }

  const calorieHistory = logs.slice(0, 30).map((l) => ({ date: l.date, kcal: Math.round(l.totalKcal), protein: Math.round(l.totalProtein) })).reverse();
  let kcalOnTarget = 0, proteinHit = 0, totalMealCompletion = 0, totalExpectedMeals = 0;
  let totalEatingWindowHrs = 0, lateNightDays = 0;
  let consecutiveLowProtein = 0, maxLowProtein = 0;
  let lowCalDays = 0;

  for (const log of logs) {
    const deficit = Math.abs(log.totalKcal - DAILY_KCAL);
    if (deficit <= 250) kcalOnTarget++;
    if (log.totalProtein >= 130) proteinHit++;
    else consecutiveLowProtein++;
    if (log.totalKcal < DAILY_KCAL * 0.7 && log.totalKcal > 0) lowCalDays++;
    maxLowProtein = Math.max(maxLowProtein, consecutiveLowProtein);
    if (log.totalProtein >= 130) consecutiveLowProtein = 0;

    totalMealCompletion += log.mealsLogged;
    totalExpectedMeals += log.totalMeals;

    // Eating window
    if (log.mealTimes.length >= 2) {
      const times = log.mealTimes.map(timeStrToMinutes).filter((t) => t >= 0).sort((a, b) => a - b);
      if (times.length >= 2) {
        const windowHrs = (times[times.length - 1] - times[0]) / 60;
        totalEatingWindowHrs += windowHrs;
        if (times[times.length - 1] > 22 * 60) lateNightDays++;
      }
    }
  }

  const n = logs.length;
  const kcalAdherenceRate = Math.round((kcalOnTarget / n) * 100);
  const proteinHitRate = Math.round((proteinHit / n) * 100);
  const mealCompletionRate = totalExpectedMeals > 0 ? Math.round((totalMealCompletion / totalExpectedMeals) * 100) : 0;
  const avgDailyKcal = Math.round(logs.reduce((a, l) => a + l.totalKcal, 0) / n);
  const avgDailyProtein = Math.round(logs.reduce((a, l) => a + l.totalProtein, 0) / n);
  const avgEatingWindowHours = Math.round((totalEatingWindowHrs / n) * 10) / 10;

  // Suggestions & risks
  if (maxLowProtein >= 3) risks.push(`⚠️ You've had ${maxLowProtein} consecutive days under 130g protein. Muscle loss risk — prioritize paneer, eggs, and soya.`);
  if (lowCalDays >= 2) risks.push(`⚠️ ${lowCalDays} days well below calorie target — severe restriction can trigger muscle catabolism.`);
  if (lateNightDays >= 3) risks.push(`🌙 Eating after 10pm on ${lateNightDays} days — late eating disrupts recovery and sleep quality.`);
  if (avgEatingWindowHours > 14) suggestions.push(`⏱ Your eating window is ~${avgEatingWindowHours}h. Consider compressing to 12h for better metabolic health.`);
  if (kcalAdherenceRate >= 70) wins.push(`✅ ${kcalAdherenceRate}% calorie adherence — excellent diet consistency!`);
  if (proteinHitRate >= 80) wins.push(`💪 Hit protein target on ${proteinHitRate}% of days — your muscle retention is well-supported.`);
  if (mealCompletionRate >= 85) wins.push(`🎯 Completing ${mealCompletionRate}% of planned meals — disciplined eating!`);
  if (proteinHitRate < 60) suggestions.push(`💡 Protein target missed on ${100 - proteinHitRate}% of days. Try adding 2 boiled eggs or 50g paneer as a snack.`);
  if (kcalAdherenceRate < 50) suggestions.push(`💡 Calorie tracking is inconsistent. Even rough logging helps — aim to log at least the biggest 3 meals.`);

  return {
    totalDaysLogged: n, avgDailyKcal, avgDailyProtein,
    kcalAdherenceRate, proteinHitRate, mealCompletionRate,
    calorieHistory, mealSkipCounts: {},
    suggestions, risks, wins,
    avgEatingWindowHours, lateNightEatingDays: lateNightDays,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function computeStreaks(dates: string[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };
  let current = 1, longest = 1, streak = 1;
  const set = new Set(dates);
  const sorted = [...set].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) { streak++; longest = Math.max(longest, streak); }
    else { streak = 1; }
  }
  // Check if current streak is ongoing
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (set.has(today) || set.has(yesterday)) {
    let cs = 1;
    let check = set.has(today) ? today : yesterday;
    while (true) {
      const prev = new Date(new Date(check).getTime() - 86400000).toISOString().slice(0, 10);
      if (set.has(prev)) { cs++; check = prev; } else break;
    }
    current = cs;
  } else {
    current = 0;
  }
  return { current, longest };
}

function timeStrToMinutes(t: string): number {
  const m = t.match(/(\d+):(\d+)/);
  if (!m) return -1;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

export { formatMs };
