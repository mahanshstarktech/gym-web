"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Clock, AlertTriangle } from "lucide-react";
import { cn, todayKey } from "@/lib/utils";
import { MEAL_DAYS, parseMacros, DAILY_KCAL, DAILY_PROTEIN, type Meal } from "@/lib/data";

// ─── State Types ──────────────────────────────────────────────────────────────
type ItemState = {
  // meal-level mark: true = ALL items eaten; false = unmarked
  mealEaten: boolean;
  mealTime: string | null;
  // individual item tracking: { itemIndex: true/false }
  itemsEaten: Record<number, boolean>;
};

type LogState = Record<number, ItemState>; // keyed by mealIndex

const LOG_KEY = `lp_food_log_${todayKey()}`;

function loadLog(): LogState {
  try {
    const s = localStorage.getItem(LOG_KEY);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

function saveLog(log: LogState) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch {}
}

// Compute macros consumed for a meal considering partial item tracking
function computeMealConsumed(meal: Meal, state: ItemState | undefined): { kcal: number; protein: number } {
  if (!state) return { kcal: 0, protein: 0 };
  const total = parseMacros(meal.macros);
  const n = meal.items.length;
  if (state.mealEaten) return total;
  // partial: each item = 1/n of the meal macros
  const eaten = Object.values(state.itemsEaten).filter(Boolean).length;
  if (eaten === 0) return { kcal: 0, protein: 0 };
  return { kcal: (total.kcal / n) * eaten, protein: (total.protein / n) * eaten };
}

// Is this meal fully logged?
function isMealFullyLogged(meal: Meal, state: ItemState | undefined): boolean {
  if (!state) return false;
  if (state.mealEaten) return true;
  const eaten = Object.values(state.itemsEaten).filter(Boolean).length;
  return eaten === meal.items.length;
}

// Time parsing for smart banner
function timeToMinutes(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return -1;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

export function FoodLogClient() {
  const dow = new Date().getDay();
  const dayPlan = MEAL_DAYS[dow];
  const meals = dayPlan.meals;

  const [log, setLog] = useState<LogState>({});
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [now, setNow] = useState(new Date());

  useEffect(() => { setLog(loadLog()); }, []);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(id); }, []);

  const updateLog = useCallback((newLog: LogState) => {
    setLog(newLog);
    saveLog(newLog);
  }, []);

  // Toggle entire meal as eaten/uneaten
  const toggleMeal = useCallback((idx: number) => {
    setLog((prev) => {
      const cur = prev[idx];
      const newEaten = !cur?.mealEaten;
      const t = new Date();
      const timeStr = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
      const next = {
        ...prev,
        [idx]: {
          mealEaten: newEaten,
          mealTime: newEaten ? timeStr : null,
          // if marking as fully eaten, mark all items; if uneating, clear all
          itemsEaten: newEaten
            ? Object.fromEntries(meals[idx].items.map((_, i) => [i, true]))
            : {},
        },
      };
      saveLog(next);
      return next;
    });
  }, [meals]);

  // Toggle a single item within a meal
  const toggleItem = useCallback((mealIdx: number, itemIdx: number) => {
    setLog((prev) => {
      const cur = prev[mealIdx] ?? { mealEaten: false, mealTime: null, itemsEaten: {} };
      const newItemsEaten = { ...cur.itemsEaten, [itemIdx]: !cur.itemsEaten[itemIdx] };
      const allEaten = meals[mealIdx].items.every((_, i) => newItemsEaten[i]);
      const t = new Date();
      const timeStr = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
      const next = {
        ...prev,
        [mealIdx]: {
          mealEaten: allEaten, // auto-check whole meal when all items done
          mealTime: allEaten ? timeStr : cur.mealTime,
          itemsEaten: newItemsEaten,
        },
      };
      saveLog(next);
      return next;
    });
  }, [meals]);

  // Compute totals
  const totals = meals.reduce(
    (acc, m, i) => {
      const c = computeMealConsumed(m, log[i]);
      return { kcal: acc.kcal + c.kcal, protein: acc.protein + c.protein };
    },
    { kcal: 0, protein: 0 }
  );

  const kcalPct = Math.min(100, (totals.kcal / DAILY_KCAL) * 100);
  const proteinPct = Math.min(100, (totals.protein / DAILY_PROTEIN) * 100);

  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Next uneaten meal
  const nextMealIdx = meals.findIndex((m, i) => !isMealFullyLogged(m, log[i]));
  const nextMeal = nextMealIdx >= 0 ? meals[nextMealIdx] : null;
  const allDone = nextMealIdx === -1;

  const mealDiff = nextMeal ? timeToMinutes(nextMeal.time) - nowMin : 0;
  const bannerState = allDone ? "done" : mealDiff < -90 ? "missed" : mealDiff < 0 ? "eat-now" : mealDiff <= 30 ? "soon" : "plan";

  const bannerColor = { done: "var(--sage)", "eat-now": "var(--paprika)", soon: "var(--turmeric)", plan: "var(--muted)", missed: "var(--paprika)" }[bannerState];

  // Day summary at end of day (or if all done)
  const missedMeals = meals.filter((m, i) => {
    const mealMin = timeToMinutes(m.time);
    return !isMealFullyLogged(m, log[i]) && mealMin < nowMin - 90;
  });

  return (
    <div className="space-y-5">
      {/* Day label */}
      <div className="flex items-center gap-3">
        <h2 className="font-display text-xl text-[--text]">{dayPlan.name}</h2>
        <span className="text-[--muted] font-mono text-xs">— {dayPlan.subtitle}</span>
      </div>

      {/* Smart Banner */}
      <motion.div layout className="card" style={{ borderLeftWidth: 3, borderLeftColor: bannerColor }}>
        {allDone ? (
          <div>
            <p className="font-display text-2xl" style={{ color: bannerColor }}>🎉 All meals logged!</p>
            <p className="font-mono text-xs text-[--muted] mt-1">Great discipline. Check today's summary below.</p>
          </div>
        ) : nextMeal ? (
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-widest mb-1" style={{ color: bannerColor }}>
              {bannerState === "eat-now" ? "🔥 Eat Right Now" :
               bannerState === "missed" ? "⚠ Window passed" :
               bannerState === "soon" ? `⏳ In ${mealDiff} min` : "📅 Next up"}
            </p>
            <p className="font-display text-xl text-[--text]">{nextMeal.label} — {nextMeal.name}</p>
            <p className="font-mono text-xs text-[--muted] mt-1">At {nextMeal.time} · {nextMeal.macros}</p>
          </div>
        ) : null}
      </motion.div>

      {/* Macro Progress */}
      <div className="card space-y-3">
        <h2 className="font-display text-xl text-[--text]">Today's Nutrition</h2>
        {[
          { label: "Calories", val: Math.round(totals.kcal), target: DAILY_KCAL, unit: "kcal", type: "kcal" as const, pct: kcalPct },
          { label: "Protein", val: Math.round(totals.protein), target: DAILY_PROTEIN, unit: "g", type: "protein" as const, pct: proteinPct },
        ].map((b) => (
          <div key={b.label}>
            <div className="flex justify-between mb-1.5">
              <span className="text-sm text-[--text]">{b.label}</span>
              <span className="font-mono text-xs text-[--muted]">{b.val.toLocaleString()} / {b.target.toLocaleString()} {b.unit}</span>
            </div>
            <div className="progress-bar">
              <motion.div className={`progress-fill ${b.type}`} animate={{ width: `${b.pct}%` }} transition={{ duration: 0.6 }} />
            </div>
          </div>
        ))}
        <p className="font-mono text-[0.6rem] text-[--muted] uppercase tracking-wider">
          Daily total: {dayPlan.total}
        </p>
      </div>

      {/* Meal Cards */}
      <div className="space-y-3">
        {meals.map((meal, mIdx) => {
          const state = log[mIdx];
          const fullyLogged = isMealFullyLogged(meal, state);
          const mealMin = timeToMinutes(meal.time);
          const diff = mealMin - nowMin;
          const consumed = computeMealConsumed(meal, state);
          const eatenItemCount = state ? Object.values(state.itemsEaten).filter(Boolean).length : 0;
          const partiallyEaten = !fullyLogged && eatenItemCount > 0;
          const isExpanded = !!expandedItems[mIdx];

          let statusBadge: React.ReactNode = null;
          if (fullyLogged) statusBadge = <span className="badge badge-green">✓ Done</span>;
          else if (partiallyEaten) statusBadge = <span className="badge badge-gold">⬤ {eatenItemCount}/{meal.items.length} items</span>;
          else if (diff < -90) statusBadge = <span className="badge badge-red">✗ Missed window</span>;
          else if (diff < 0) statusBadge = <span className="badge badge-red">🔥 Eat Now</span>;
          else if (diff <= 30) statusBadge = <span className="badge badge-gold">⏳ {diff}m</span>;

          return (
            <motion.div
              key={mIdx}
              layout
              className={cn(
                "card transition-all duration-300",
                fullyLogged && "border-[--sage] bg-[rgba(127,176,140,0.04)]",
                !fullyLogged && meal.timeSensitive && "border-l-2 border-l-[--turmeric]",
                !fullyLogged && diff < -90 && !partiallyEaten && "opacity-60",
              )}
            >
              {/* Meal header row */}
              <div className="flex flex-wrap items-start gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  <span className="badge badge-gold shrink-0">
                    <Clock size={10} /> {meal.time}
                  </span>
                  {statusBadge}
                  {meal.timeSensitive && !fullyLogged && <span className="badge badge-gold shrink-0">⏰ Time-sensitive</span>}
                  {meal.office && <span className="badge badge-blue shrink-0">🏢 Office-friendly</span>}
                </div>
              </div>

              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted]">{meal.label}</p>
              <p className={cn("font-medium text-[--text] mt-0.5", fullyLogged && "line-through opacity-50")}>{meal.name}</p>
              <p className="font-mono text-xs text-[--muted] mt-1">{meal.macros}</p>

              {/* Eaten time */}
              {state?.mealTime && (
                <p className="font-mono text-[0.65rem] text-[--sage] mt-1.5">✓ Logged at {state.mealTime}</p>
              )}

              {/* Partial consumed */}
              {partiallyEaten && (
                <p className="font-mono text-[0.65rem] text-[--turmeric] mt-1.5">
                  Consumed so far: ~{Math.round(consumed.kcal)} kcal · ~{Math.round(consumed.protein)}g protein
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                {/* Mark whole meal */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toggleMeal(mIdx)}
                  className={cn(
                    "px-3 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5",
                    fullyLogged
                      ? "border border-[--line] text-[--muted] hover:text-[--paprika] hover:border-[--paprika]"
                      : "bg-[--turmeric] text-[--ink] font-bold hover:opacity-90"
                  )}
                >
                  {fullyLogged ? "↩ Undo whole meal" : "✓ Mark whole meal eaten"}
                </motion.button>

                {/* Toggle items expand */}
                <button
                  onClick={() => setExpandedItems((e) => ({ ...e, [mIdx]: !e[mIdx] }))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[--line] text-[--muted] font-mono text-xs hover:border-[--line-strong] hover:text-[--text] transition-colors"
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Log individual items
                </button>
              </div>

              {/* Individual items panel */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-[--line] space-y-1.5">
                      <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[--muted] mb-2">
                        Tick what you actually ate. Macros auto-adjust.
                      </p>
                      {meal.items.map((item, iIdx) => {
                        const itemEaten = !!state?.itemsEaten[iIdx];
                        const perItem = parseMacros(meal.macros);
                        const perKcal = Math.round(perItem.kcal / meal.items.length);
                        const perPro = Math.round(perItem.protein / meal.items.length);
                        return (
                          <motion.button
                            key={iIdx}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => toggleItem(mIdx, iIdx)}
                            className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-[--panel-2] transition-colors text-left group"
                          >
                            {itemEaten
                              ? <CheckCircle2 size={16} className="text-[--sage] flex-none mt-0.5" />
                              : <Circle size={16} className="text-[--line] group-hover:text-[--muted] flex-none mt-0.5 transition-colors" />
                            }
                            <span className={cn("text-sm flex-1", itemEaten ? "text-[--muted] line-through" : "text-[--text]")}>
                              {item}
                            </span>
                            <span className="font-mono text-[0.6rem] text-[--muted] flex-none whitespace-nowrap">
                              ~{perKcal}kcal / ~{perPro}g P
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* End-of-day summary */}
      {(allDone || missedMeals.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h2 className="font-display text-xl text-[--text] mb-3">📊 Day Summary</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[--panel-2] rounded-xl p-3 text-center">
              <p className="font-display text-3xl text-[--turmeric]">{Math.round(totals.kcal)}</p>
              <p className="font-mono text-[0.65rem] text-[--muted]">/ {DAILY_KCAL} kcal</p>
            </div>
            <div className="bg-[--panel-2] rounded-xl p-3 text-center">
              <p className="font-display text-3xl text-[--sage]">{Math.round(totals.protein)}g</p>
              <p className="font-mono text-[0.65rem] text-[--muted]">/ {DAILY_PROTEIN}g protein</p>
            </div>
          </div>
          {missedMeals.length > 0 && (
            <div className="border border-[rgba(201,96,63,0.25)] rounded-xl p-3 bg-[rgba(201,96,63,0.05)]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-[--paprika]" />
                <p className="font-mono text-xs text-[--paprika] uppercase tracking-wider">Missed / Skipped</p>
              </div>
              {missedMeals.map((m, i) => (
                <p key={i} className="font-mono text-xs text-[--muted]">• {m.time} — {m.name}</p>
              ))}
              <p className="font-mono text-[0.6rem] text-[--muted] mt-2">
                You can still consume these if the window is not completely closed. Adjust tomorrow accordingly.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
