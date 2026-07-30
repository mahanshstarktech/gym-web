"use client";

import { motion } from "framer-motion";
import { WORKOUT_DAYS } from "@/lib/data";

export function ScheduleClient() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {WORKOUT_DAYS.map((day, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`card flex flex-col h-full ${day.rest ? "opacity-75" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted]">
                {day.name}
              </span>
              {i === new Date().getDay() && (
                <span className="badge badge-gold">Today</span>
              )}
            </div>
            
            <h3 className="font-display text-xl text-[--text] mb-1">{day.focus}</h3>
            
            <p className="font-mono text-xs text-[--muted] mb-3">{day.time}</p>

            <div className="mt-auto pt-3 border-t border-[--line]">
              {day.rest ? (
                <p className="text-sm text-[--muted] line-clamp-3">{day.note}</p>
              ) : (
                <p className="font-mono text-[0.65rem] text-[--muted]">
                  {day.blocks?.length ?? 0} blocks · {day.blocks?.reduce((a, b) => a + b.ex.length, 0)} exercises
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
