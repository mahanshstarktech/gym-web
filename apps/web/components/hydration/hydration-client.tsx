"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Droplets, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAILY_WATER } from "@/lib/data";

const WATER_KEY = `lp_water_${new Date().toISOString().slice(0, 10)}`;

export function HydrationClient() {
  const [glasses, setGlasses] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(WATER_KEY);
      if (saved) setGlasses(parseInt(saved, 10));
    } catch {}
  }, []);

  const setAndSave = useCallback((n: number) => {
    setGlasses(n);
    try { localStorage.setItem(WATER_KEY, String(n)); } catch {}
  }, []);

  const pct = Math.min(100, (glasses / DAILY_WATER) * 100);
  const litres = (glasses * 0.35).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Big counter */}
      <div className="card text-center py-8">
        <p className="font-display text-7xl text-[--sky]">{glasses}</p>
        <p className="font-mono text-sm text-[--muted] mt-1">/ {DAILY_WATER} glasses · {litres}L</p>
        {glasses >= DAILY_WATER && (
          <p className="text-[--sage] font-mono text-xs mt-2 uppercase tracking-wider">✓ Daily target achieved! 🎉</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="card">
        <div className="flex justify-between mb-2 text-xs font-mono text-[--muted]">
          <span>Progress</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="progress-bar">
          <motion.div
            className="progress-fill water"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Drop grid — 10 drops */}
      <div className="card">
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-[--muted] mb-4">Tap each drop when you finish a glass</p>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: DAILY_WATER }).map((_, i) => {
            const filled = i < glasses;
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.85 }}
                onClick={() => setAndSave(filled ? i : i + 1)}
                className={cn(
                  "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all duration-200",
                  filled
                    ? "bg-[rgba(95,173,201,0.18)] border-[--sky]"
                    : "border-[--line] opacity-40 hover:opacity-70"
                )}
              >
                <Droplets
                  size={22}
                  className={filled ? "text-[--sky]" : "text-[--muted]"}
                  fill={filled ? "var(--sky)" : "transparent"}
                />
                <span className="font-mono text-[0.55rem] text-[--muted]">{i + 1}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setAndSave(Math.min(DAILY_WATER, glasses + 1))}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-[--sky] text-[--ink] font-mono text-sm font-bold uppercase tracking-wider"
        >
          <Droplets size={16} /> + Glass
        </motion.button>
        {glasses > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setAndSave(glasses - 1)}
            className="flex items-center gap-2 px-4 py-3 rounded-full border border-[--line] text-[--muted] font-mono text-sm hover:text-[--paprika] hover:border-[--paprika] transition-colors"
          >
            − Undo
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setAndSave(0)}
          className="flex items-center gap-2 px-4 py-3 rounded-full border border-[--line] text-[--muted] font-mono text-sm hover:text-[--paprika] hover:border-[--paprika] transition-colors"
        >
          <RotateCcw size={14} /> Reset
        </motion.button>
      </div>

      {/* Hydration tips */}
      <div className="card border-l-2 border-l-[--sky]">
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-[--sky] mb-2">Tip</p>
        <p className="text-sm text-[--muted]">
          On training days, aim for ~3.5L (10 glasses). Add an extra glass for every 30 minutes of heavy sweating.
          The monsoon humidity makes you sweat more even at rest — stay ahead of thirst.
        </p>
      </div>
    </div>
  );
}
