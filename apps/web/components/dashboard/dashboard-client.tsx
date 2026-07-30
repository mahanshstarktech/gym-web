"use client";

import { useEffect, useState } from "react";
import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import { Dumbbell, UtensilsCrossed, Droplets, Flame, TrendingUp, Timer } from "lucide-react";
import Link from "next/link";
import { cn, todayKey } from "@/lib/utils";
import { DAILY_KCAL, DAILY_PROTEIN, MEAL_DAYS, parseMacros, WORKOUT_DAYS } from "@/lib/data";

const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function DashboardClient() {
  const [stats, setStats] = useState({
    weight: "—", weightTrend: "",
    fat: "—", fatTrend: "",
    daysLeft: 84, daysIn: 1,
    kcal: 0, protein: 0, water: 0,
    streak: 0, bestStreak: 0
  });

  const [nextMeal, setNextMeal] = useState<{ label: string; time: string; name: string } | null>(null);

  useEffect(() => {
    const loadData = () => {
      // 1. Calculate Days
      let startStr = localStorage.getItem("lp_start");
      if (!startStr) {
        startStr = new Date().toISOString();
        localStorage.setItem("lp_start", startStr);
      }
      const daysIn = Math.max(1, Math.floor((new Date().getTime() - new Date(startStr).getTime()) / 86400000) + 1);
      const daysLeft = Math.max(0, 84 - daysIn + 1);
  
      // 2. Measurements
      let weight = "—", weightTrend = "";
      let fat = "—", fatTrend = "";
      try {
        const entries = JSON.parse(localStorage.getItem("lp_entries") || "[]");
        if (entries.length > 0) {
          const latest = entries[entries.length - 1];
          weight = latest.weight.toString();
          fat = latest.fat ? latest.fat.toString() : "—";
          
          if (entries.length > 1) {
            const prev = entries[entries.length - 2];
            const wDiff = latest.weight - prev.weight;
            weightTrend = wDiff > 0 ? `↑ ${wDiff.toFixed(1)}` : `↓ ${Math.abs(wDiff).toFixed(1)}`;
            if (latest.fat && prev.fat) {
              const fDiff = latest.fat - prev.fat;
              fatTrend = fDiff > 0 ? `↑ ${fDiff.toFixed(1)}%` : `↓ ${Math.abs(fDiff).toFixed(1)}%`;
            }
          }
        }
      } catch {}
  
      // 3. Nutrition (Food Log)
      let kcal = 0;
      let protein = 0;
      const dow = new Date().getDay();
      const dayPlan = MEAL_DAYS[dow];
      try {
        const log = JSON.parse(localStorage.getItem(`lp_food_log_${todayKey()}`) || "{}");
        dayPlan.meals.forEach((meal, i) => {
          const state = log[i];
          if (!state) return;
          const total = parseMacros(meal.macros);
          if (state.mealEaten) {
            kcal += total.kcal;
            protein += total.protein;
          } else {
            const eaten = Object.values(state.itemsEaten || {}).filter(Boolean).length;
            if (eaten > 0) {
              kcal += (total.kcal / meal.items.length) * eaten;
              protein += (total.protein / meal.items.length) * eaten;
            }
          }
        });
        
        // Calculate Next Meal
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const upcoming = dayPlan.meals.find((m, i) => {
          const state = log[i];
          const fullyLogged = state?.mealEaten || (Object.values(state?.itemsEaten || {}).filter(Boolean).length === m.items.length);
          return !fullyLogged;
        });
        if (upcoming) {
          setNextMeal({ label: upcoming.label, time: upcoming.time, name: upcoming.name });
        }
      } catch {}
  
      // 4. Water
      let water = 0;
      try {
        const wSaved = localStorage.getItem(`lp_water_${todayKey()}`);
        if (wSaved) water = parseInt(wSaved, 10);
      } catch {}
  
      // 5. Streak
      let streak = 0;
      let bestStreak = 0;
      try {
        const s = JSON.parse(localStorage.getItem("lp_streak") || '{"current":0,"best":0}');
        streak = s.current || 0;
        bestStreak = s.best || 0;
      } catch {}
  
      setStats({ weight, weightTrend, fat, fatTrend, daysLeft, daysIn, kcal, protein, water, streak, bestStreak });
    };

    loadData();
    window.addEventListener("lp_entries_updated", loadData);
    window.addEventListener("storage", loadData); // Listen for SyncManager updates
    return () => {
      window.removeEventListener("lp_entries_updated", loadData);
      window.removeEventListener("storage", loadData);
    };
  }, []);

  const dow = new Date().getDay();
  const workout = WORKOUT_DAYS[dow];

  const statCards = [
    { label: "Weight", value: stats.weight, unit: "kg", trend: stats.weightTrend },
    { label: "Body Fat", value: stats.fat, unit: "%", trend: stats.fatTrend },
    { label: "Days Left", value: stats.daysLeft.toString(), unit: "days", trend: "of 84" },
    { label: "Kcal Target", value: DAILY_KCAL.toLocaleString(), unit: "kcal", trend: "today" },
  ];

  const quickCards = [
    { href: "/workout", icon: Dumbbell, label: "Today's Workout", sub: workout.rest ? "Rest Day" : workout.focus, cta: "View Plan", color: "var(--turmeric)" },
    { href: "/meals/log", icon: UtensilsCrossed, label: "Next Meal", sub: nextMeal ? `${nextMeal.label} - ${nextMeal.time}` : "All Done", cta: nextMeal ? "Log It" : "View Log", color: "var(--sage)" },
    { href: "/hydration", icon: Droplets, label: "Water", sub: `${stats.water} / 10 glasses`, cta: "+ Glass", color: "var(--sky)" },
    { href: "/timer", icon: Timer, label: "Interval Timer", sub: "Quick access", cta: "Start", color: "var(--paprika)" },
  ];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">

      {/* Stats Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="card flex flex-col gap-1">
            <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[--muted]">{s.label}</p>
            <div className="flex items-end gap-1.5">
              <span className="font-display text-4xl text-[--text]">{s.value}</span>
              {s.unit && <span className="font-mono text-xs text-[--muted] mb-1">{s.unit}</span>}
            </div>
            <span className="font-mono text-[0.65rem] text-[--turmeric] min-h-[14px]">{s.trend}</span>
          </div>
        ))}
      </motion.div>

      {/* Daily Progress */}
      <motion.div variants={fadeUp} className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-[--text]">Today's Progress</h2>
          <span className="badge badge-gold">Day {stats.daysIn}</span>
        </div>
        <div className="space-y-3">
          <MacroBar label="Calories" current={Math.round(stats.kcal)} target={DAILY_KCAL} type="kcal" unit="kcal" />
          <MacroBar label="Protein" current={Math.round(stats.protein)} target={DAILY_PROTEIN} type="protein" unit="g" />
          <MacroBar label="Water" current={stats.water} target={10} type="water" unit="glasses" />
        </div>
      </motion.div>

      {/* Quick Access Cards */}
      <motion.div variants={fadeUp}>
        <h2 className="font-display text-xl text-[--text] mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickCards.map((card) => (
            <Link key={card.label} href={card.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="card flex flex-col gap-3 h-full cursor-pointer hover:border-[--line-strong] transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${card.color}18`, border: `1px solid ${card.color}30` }}
                >
                  <card.icon size={18} style={{ color: card.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-[--text]">{card.label}</p>
                  <p className="font-mono text-[0.65rem] text-[--muted] mt-0.5 truncate">{card.sub}</p>
                </div>
                <span
                  className="font-mono text-xs font-medium self-start px-2.5 py-1 rounded-full"
                  style={{ background: `${card.color}15`, color: card.color }}
                >
                  {card.cta} →
                </span>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Streak */}
      <motion.div variants={fadeUp} className="card flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[rgba(224,168,58,0.12)] flex items-center justify-center flex-none">
          <Flame size={24} className={stats.streak > 0 ? "text-[--turmeric]" : "text-[--muted]"} />
        </div>
        <div>
          <p className={cn("font-display text-2xl", stats.streak > 0 ? "text-[--turmeric]" : "text-[--text]")}>
            {stats.streak} Day Streak {stats.streak > 0 ? "🔥" : ""}
          </p>
          <p className="font-mono text-xs text-[--muted]">Best: {stats.bestStreak} days · Keep it going!</p>
        </div>
        <div className="ml-auto">
          <TrendingUp size={20} className="text-[--muted]" />
        </div>
      </motion.div>

      {/* Quote */}
      <motion.div variants={fadeUp} className="card border-l-2 border-l-[--turmeric]">
        <p className="text-[--muted] text-sm italic">
          "Discipline is the bridge between goals and accomplishment."
        </p>
        <p className="font-mono text-[0.6rem] text-[--muted] mt-2 uppercase tracking-wider">— Jim Rohn</p>
      </motion.div>

    </motion.div>
  );
}

function MacroBar({ label, current, target, type, unit }: {
  label: string; current: number; target: number; type: "kcal" | "protein" | "water"; unit: string;
}) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-[--text]">{label}</span>
        <span className="font-mono text-xs text-[--muted]">{current.toLocaleString()} / {target.toLocaleString()} {unit}</span>
      </div>
      <div className="progress-bar">
        <motion.div
          className={`progress-fill ${type}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        />
      </div>
    </div>
  );
}
