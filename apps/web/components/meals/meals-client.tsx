"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MEAL_DAYS } from "@/lib/data";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MealsClient() {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const plan = MEAL_DAYS[selectedDay];

  return (
    <div className="space-y-5">
      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {DAYS_SHORT.map((d, i) => {
          const isToday = i === new Date().getDay();
          const isSelected = i === selectedDay;
          return (
            <button key={i} onClick={() => setSelectedDay(i)}
              className={cn(
                "flex-none px-3 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-all duration-150 min-w-[3rem]",
                isSelected ? "bg-[--turmeric] text-[--ink] font-bold" :
                isToday ? "border border-[--turmeric] text-[--turmeric]" :
                "border border-[--line] text-[--muted] hover:border-[--line-strong]"
              )}>
              {d}
            </button>
          );
        })}
      </div>

      {/* Day subtitle */}
      <p className="font-mono text-xs text-[--muted]">{plan.subtitle}</p>

      {/* Meal Cards */}
      <motion.div className="space-y-3">
        {plan.meals.map((meal, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={cn("card", meal.timeSensitive && "border-l-2 border-l-[--turmeric]", meal.office && !meal.timeSensitive && "border-l-2 border-l-[--sky]")}>
            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
              <span className="badge badge-gold">{meal.time}</span>
              <div className="flex gap-1.5 flex-wrap">
                {meal.timeSensitive && <span className="badge badge-gold">⏰ Time-sensitive</span>}
                {meal.office && <span className="badge badge-blue">🏢 Office-friendly</span>}
              </div>
            </div>
            <p className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted] mb-0.5">{meal.label}</p>
            <p className="font-medium text-[--text]">{meal.name}</p>
            {/* Items list */}
            <ul className="mt-2 space-y-0.5">
              {meal.items.map((item, ii) => (
                <li key={ii} className="text-xs text-[--muted] font-mono flex items-start gap-1.5">
                  <span className="text-[--turmeric] mt-0.5 flex-none">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="font-mono text-xs text-[--turmeric] mt-2.5">{meal.macros}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Day total */}
      <div className="card flex items-center justify-between">
        <span className="font-mono text-xs text-[--muted] uppercase tracking-wider">Daily Total</span>
        <span className="font-display text-lg text-[--text]">{plan.total}</span>
      </div>
    </div>
  );
}
