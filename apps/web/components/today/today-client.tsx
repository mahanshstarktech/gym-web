"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Dumbbell, UtensilsCrossed } from "lucide-react";
import { WORKOUT_DAYS, MEAL_DAYS } from "@/lib/data";

export function TodayClient() {
  const dow = new Date().getDay();
  const workout = WORKOUT_DAYS[dow];
  const meals = MEAL_DAYS[dow];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Workout Side */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[rgba(224,168,58,0.12)] flex items-center justify-center">
            <Dumbbell size={20} className="text-[--turmeric]" />
          </div>
          <h2 className="font-display text-2xl text-[--text]">Training</h2>
        </div>
        
        <div className="card">
          <h3 className="font-display text-xl text-[--text] mb-1">{workout.focus}</h3>
          <p className="font-mono text-xs text-[--muted] mb-4">{workout.time}</p>
          
          {workout.rest ? (
            <p className="text-sm text-[--muted]">{workout.note}</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {workout.blocks?.map((b, i) => (
                <li key={i} className="text-sm text-[--text]">
                  <span className="font-mono text-[0.65rem] text-[--turmeric] uppercase mr-2 tracking-wider">Block {i+1}</span>
                  {b.label}
                </li>
              ))}
            </ul>
          )}
          
          <Link href="/workout">
            <button className="w-full mt-2 px-4 py-2.5 rounded-xl border border-[--line] text-[--muted] font-mono text-xs uppercase hover:bg-[--panel-2] transition-colors">
              Open Full Workout
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Meals Side */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[rgba(127,176,140,0.12)] flex items-center justify-center">
            <UtensilsCrossed size={20} className="text-[--sage]" />
          </div>
          <h2 className="font-display text-2xl text-[--text]">Nutrition</h2>
        </div>

        <div className="card">
          <h3 className="font-display text-xl text-[--text] mb-1">{meals.name} Plan</h3>
          <p className="font-mono text-xs text-[--muted] mb-4">{meals.total}</p>

          <div className="space-y-3 mb-4">
            {meals.meals.slice(0, 3).map((m, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="font-mono text-xs text-[--muted] w-16 flex-none">{m.time}</span>
                <div>
                  <p className="text-sm text-[--text] font-medium">{m.name}</p>
                  <p className="font-mono text-[0.65rem] text-[--muted] mt-0.5">{m.macros}</p>
                </div>
              </div>
            ))}
            {meals.meals.length > 3 && (
              <p className="font-mono text-[0.65rem] text-[--muted] text-center pt-2 border-t border-[--line]">
                + {meals.meals.length - 3} more meals
              </p>
            )}
          </div>

          <Link href="/meals">
            <button className="w-full mt-2 px-4 py-2.5 rounded-xl border border-[--line] text-[--muted] font-mono text-xs uppercase hover:bg-[--panel-2] transition-colors">
              Open Full Plan
            </button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
