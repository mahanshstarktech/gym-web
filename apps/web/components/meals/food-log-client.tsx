"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Clock, AlertTriangle, Minus, Plus } from "lucide-react";
import { cn, todayKey } from "@/lib/utils";
import { MEAL_DAYS, parseMacros, DAILY_KCAL, DAILY_PROTEIN, type Meal } from "@/lib/data";

// ─── State Types ──────────────────────────────────────────────────────────────
type ItemState = {
  mealEaten: boolean;
  mealTime: string | null;
  itemsEaten: Record<number, boolean>;
  // NEW: quantity multiplier per item (e.g. 1.0 = planned, 1.5 = 50% more, 2 = double)
  itemQty: Record<number, number>;
};

type LogState = Record<number, ItemState>;

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

// Compute macros consumed for a meal with quantity multipliers
function computeMealConsumed(meal: Meal, state: ItemState | undefined): { kcal: number; protein: number } {
  if (!state) return { kcal: 0, protein: 0 };
  const total = parseMacros(meal.macros);
  const n = meal.items.length;
  if (n === 0) return { kcal: 0, protein: 0 };

  // Per-item macro base
  const perItemKcal = total.kcal / n;
  const perItemProtein = total.protein / n;

  if (state.mealEaten && Object.keys(state.itemQty ?? {}).length === 0) {
    // Whole meal marked without custom qtys
    return total;
  }

  // Sum individual items with qty multiplier
  let kcal = 0, protein = 0;
  for (let i = 0; i < n; i++) {
    const eaten = state.itemsEaten[i] ?? state.mealEaten;
    if (!eaten) continue;
    const qty = state.itemQty?.[i] ?? 1;
    kcal += perItemKcal * qty;
    protein += perItemProtein * qty;
  }
  return { kcal, protein };
}

function isMealFullyLogged(meal: Meal, state: ItemState | undefined): boolean {
  if (!state) return false;
  if (state.mealEaten && !Object.keys(state.itemsEaten).length) return true;
  const eaten = Object.values(state.itemsEaten).filter(Boolean).length;
  return eaten === meal.items.length;
}

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

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Toggle entire meal
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
          itemsEaten: newEaten
            ? Object.fromEntries(meals[idx].items.map((_, i) => [i, true]))
            : {},
          itemQty: cur?.itemQty ?? {},
        },
      };
      saveLog(next);
      return next;
    });
  }, [meals]);

  // Toggle a single item
  const toggleItem = useCallback((mealIdx: number, itemIdx: number) => {
    setLog((prev) => {
      const cur = prev[mealIdx] ?? { mealEaten: false, mealTime: null, itemsEaten: {}, itemQty: {} };
      const newItemsEaten = { ...cur.itemsEaten, [itemIdx]: !cur.itemsEaten[itemIdx] };
      // Default qty to 1 when first ticking
      const newItemQty = { ...cur.itemQty };
      if (!cur.itemsEaten[itemIdx] && !newItemQty[itemIdx]) newItemQty[itemIdx] = 1;
      const allEaten = meals[mealIdx].items.every((_, i) => newItemsEaten[i]);
      const t = new Date();
      const timeStr = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
      const next = {
        ...prev,
        [mealIdx]: {
          mealEaten: allEaten,
          mealTime: allEaten ? timeStr : cur.mealTime,
          itemsEaten: newItemsEaten,
          itemQty: newItemQty,
        },
      };
      saveLog(next);
      return next;
    });
  }, [meals]);

  // Adjust quantity for an item
  const adjustQty = useCallback((mealIdx: number, itemIdx: number, delta: number) => {
    setLog((prev) => {
      const cur = prev[mealIdx] ?? { mealEaten: false, mealTime: null, itemsEaten: {}, itemQty: {} };
      const currentQty = cur.itemQty?.[itemIdx] ?? 1;
      const newQty = Math.max(0.5, Math.round((currentQty + delta) * 2) / 2); // steps of 0.5
      const next = {
        ...prev,
        [mealIdx]: {
          ...cur,
          itemQty: { ...cur.itemQty, [itemIdx]: newQty },
          // Ensure item is marked eaten if qty > 0
          itemsEaten: { ...cur.itemsEaten, [itemIdx]: true },
        },
      };
      saveLog(next);
      return next;
    });
  }, []);

  // Totals
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

  const nextMealIdx = meals.findIndex((m, i) => !isMealFullyLogged(m, log[i]));
  const nextMeal = nextMealIdx >= 0 ? meals[nextMealIdx] : null;
  const allDone = nextMealIdx === -1;

  const mealDiff = nextMeal ? timeToMinutes(nextMeal.time) - nowMin : 0;
  const bannerState = allDone ? "done" : mealDiff < -90 ? "missed" : mealDiff < 0 ? "eat-now" : mealDiff <= 30 ? "soon" : "plan";
  const bannerColor = { done: "var(--sage)", "eat-now": "var(--paprika)", soon: "var(--turmeric)", plan: "var(--muted)", missed: "var(--paprika)" }[bannerState];

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
        <p className="font-mono text-[0.6rem] text-[--muted] uppercase tracking-wider">Daily total: {dayPlan.total}</p>
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
              key={mIdx} layout
              className={cn(
                "card transition-all duration-300",
                fullyLogged && "border-[--sage] bg-[rgba(127,176,140,0.04)]",
                !fullyLogged && meal.timeSensitive && "border-l-2 border-l-[--turmeric]",
                !fullyLogged && diff < -90 && !partiallyEaten && "opacity-60",
              )}
            >
              {/* Header badges */}
              <div className="flex flex-wrap items-start gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  <span className="badge badge-gold shrink-0"><Clock size={10} /> {meal.time}</span>
                  {statusBadge}
                  {meal.timeSensitive && !fullyLogged && <span className="badge badge-gold shrink-0">⏰ Time-sensitive</span>}
                  {meal.office && <span className="badge badge-blue shrink-0">🏢 Office-friendly</span>}
                </div>
              </div>

              <p className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted]">{meal.label}</p>
              <p className={cn("font-medium text-[--text] mt-0.5", fullyLogged && "line-through opacity-50")}>{meal.name}</p>
              <p className="font-mono text-xs text-[--muted] mt-1">{meal.macros}</p>

              {state?.mealTime && (
                <p className="font-mono text-[0.65rem] text-[--sage] mt-1.5">✓ Logged at {state.mealTime}</p>
              )}

              {/* Live macro tally when custom quantities used */}
              {(partiallyEaten || fullyLogged) && consumed.kcal > 0 && (
                <div className="mt-2 flex gap-3">
                  <span className="font-mono text-[0.6rem] text-[--turmeric]">~{Math.round(consumed.kcal)} kcal</span>
                  <span className="font-mono text-[0.6rem] text-[--sage]">~{Math.round(consumed.protein)}g protein</span>
                  {/* Show if custom qty differs from plan */}
                  {state?.itemQty && Object.values(state.itemQty).some((q) => q !== 1) && (
                    <span className="font-mono text-[0.6rem] text-[--paprika]">⚡ Custom qty</span>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
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

                <button
                  onClick={() => setExpandedItems((e) => ({ ...e, [mIdx]: !e[mIdx] }))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[--line] text-[--muted] font-mono text-xs hover:border-[--line-strong] hover:text-[--text] transition-colors"
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  Log & customize items
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
                    <div className="mt-3 pt-3 border-t border-[--line] space-y-2">
                      <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[--muted] mb-2">
                        Tick what you ate · Use +/− to adjust quantity if you ate more or less
                      </p>
                      {meal.items.map((item, iIdx) => {
                        const itemEaten = !!state?.itemsEaten[iIdx];
                        const qty = state?.itemQty?.[iIdx] ?? 1;
                        const perItem = parseMacros(meal.macros);
                        const perKcal = Math.round((perItem.kcal / meal.items.length) * qty);
                        const perPro = Math.round((perItem.protein / meal.items.length) * qty);

                        return (
                          <div key={iIdx} className={cn(
                            "rounded-xl border transition-all duration-150 p-2.5",
                            itemEaten
                              ? "border-[rgba(127,176,140,0.3)] bg-[rgba(127,176,140,0.04)]"
                              : "border-[--line] hover:border-[--line-strong]"
                          )}>
                            {/* Top row: checkbox + name + macros */}
                            <div className="flex items-start gap-2.5">
                              <button
                                onClick={() => toggleItem(mIdx, iIdx)}
                                className="flex-none mt-0.5 transition-transform active:scale-90"
                              >
                                {itemEaten
                                  ? <CheckCircle2 size={16} className="text-[--sage]" />
                                  : <Circle size={16} className="text-[--line] hover:text-[--muted] transition-colors" />}
                              </button>
                              <span className={cn("text-sm flex-1 leading-snug", itemEaten ? "text-[--muted]" : "text-[--text]")}>
                                {item}
                              </span>
                              <div className="flex-none text-right">
                                <p className="font-mono text-[0.6rem] text-[--turmeric]">~{perKcal}kcal</p>
                                <p className="font-mono text-[0.6rem] text-[--sage]">~{perPro}g P</p>
                              </div>
                            </div>

                            {/* Quantity adjuster — only show if item is checked */}
                            {itemEaten && (
                              <div className="flex items-center gap-3 mt-2 pl-6">
                                <span className="font-mono text-[0.6rem] text-[--muted]">Qty eaten:</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => adjustQty(mIdx, iIdx, -0.5)}
                                    disabled={qty <= 0.5}
                                    className="w-7 h-7 rounded-full border border-[--line] flex items-center justify-center text-[--muted] hover:border-[--turmeric] hover:text-[--turmeric] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className={cn(
                                    "font-mono text-sm min-w-[3rem] text-center font-bold",
                                    qty > 1 ? "text-[--turmeric]" : qty < 1 ? "text-[--paprika]" : "text-[--text]"
                                  )}>
                                    {qty === 1 ? "×1" : qty === 0.5 ? "½" : qty % 1 === 0 ? `×${qty}` : `×${qty}`}
                                  </span>
                                  <button
                                    onClick={() => adjustQty(mIdx, iIdx, 0.5)}
                                    className="w-7 h-7 rounded-full border border-[--line] flex items-center justify-center text-[--muted] hover:border-[--turmeric] hover:text-[--turmeric] transition-colors"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                                {qty !== 1 && (
                                  <span className="font-mono text-[0.55rem] text-[--muted]">
                                    {qty > 1 ? `+${Math.round((qty - 1) * 100)}% more than plan` : `${Math.round((1 - qty) * 100)}% less than plan`}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card">
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
