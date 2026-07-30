"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "work" | "rest" | "idle";

export function TimerClient() {
  const [workSecs, setWorkSecs] = useState(40);
  const [restSecs, setRestSecs] = useState(20);
  const [totalRounds, setTotalRounds] = useState(8);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(workSecs);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phaseDuration = phase === "work" ? workSecs : restSecs;
  const pct = phase === "idle" ? 0 : ((phaseDuration - remaining) / phaseDuration) * 100;
  const circumference = 2 * Math.PI * 90;
  const dashOffset = circumference - (circumference * pct) / 100;

  const reset = useCallback(() => {
    setRunning(false);
    setRound(1);
    setPhase("idle");
    setRemaining(workSecs);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [workSecs]);

  const start = useCallback(() => {
    if (phase === "idle") setPhase("work");
    setRunning(true);
  }, [phase]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          // beep
          try { new Audio("/beep.mp3").play(); } catch {}
          setPhase((p) => {
            if (p === "work") { setRemaining(restSecs); return "rest"; }
            // rest done
            setRound((rd) => {
              if (rd >= totalRounds) { setRunning(false); return rd; }
              return rd + 1;
            });
            setRemaining(workSecs);
            return "work";
          });
          return r;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, restSecs, workSecs, totalRounds]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const phaseColor = phase === "work" ? "var(--turmeric)" : phase === "rest" ? "var(--sage)" : "var(--muted)";
  const phaseLabel = phase === "work" ? "WORK" : phase === "rest" ? "REST" : "READY";

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Ring Timer */}
      <div className="relative flex items-center justify-center">
        <svg width="220" height="220" className="-rotate-90">
          <circle cx="110" cy="110" r="90" fill="none" stroke="var(--line)" strokeWidth="8" />
          <motion.circle
            cx="110" cy="110" r="90"
            fill="none"
            stroke={phaseColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ filter: `drop-shadow(0 0 8px ${phaseColor}60)` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="font-mono text-[0.65rem] uppercase tracking-widest" style={{ color: phaseColor }}>
            {phaseLabel}
          </span>
          <span className="font-display text-6xl" style={{ color: phaseColor }}>
            {mm}:{ss}
          </span>
          <span className="font-mono text-xs text-[--muted]">
            Round {round} / {totalRounds}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => { running ? setRunning(false) : start(); }}
          className="w-16 h-16 rounded-full flex items-center justify-center text-[--ink] font-bold text-lg transition-all"
          style={{ background: phaseColor, boxShadow: `0 0 24px ${phaseColor}50` }}
        >
          {running ? <Pause size={24} /> : <Play size={24} />}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={reset}
          className="w-16 h-16 rounded-full border border-[--line] flex items-center justify-center text-[--muted] hover:text-[--text] hover:border-[--line-strong] transition-all"
        >
          <RotateCcw size={22} />
        </motion.button>
      </div>

      {/* Settings */}
      <div className="card w-full grid grid-cols-3 gap-4">
        {[
          { label: "Work", value: workSecs, set: setWorkSecs, min: 5, max: 300, step: 5 },
          { label: "Rest", value: restSecs, set: setRestSecs, min: 5, max: 120, step: 5 },
          { label: "Rounds", value: totalRounds, set: setTotalRounds, min: 1, max: 30, step: 1 },
        ].map(({ label, value, set, min, max, step }) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <button
              onClick={() => set((v) => Math.min(max, v + step))}
              className="w-8 h-8 rounded-full border border-[--line] flex items-center justify-center text-[--muted] hover:text-[--turmeric] hover:border-[--turmeric] transition-colors"
            >
              <ChevronUp size={16} />
            </button>
            <div className="text-center">
              <p className="font-display text-2xl text-[--text]">
                {label === "Work" || label === "Rest"
                  ? `${Math.floor(value / 60) > 0 ? Math.floor(value / 60) + "m " : ""}${value % 60}s`
                  : value}
              </p>
              <p className="font-mono text-[0.6rem] uppercase text-[--muted] tracking-wider">{label}</p>
            </div>
            <button
              onClick={() => set((v) => Math.max(min, v - step))}
              className="w-8 h-8 rounded-full border border-[--line] flex items-center justify-center text-[--muted] hover:text-[--paprika] hover:border-[--paprika] transition-colors"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Phase indicator bar */}
      <div className="w-full card">
        <div className="flex gap-1 mb-2">
          {Array.from({ length: totalRounds }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-2 rounded-full transition-all duration-300",
                i < round - 1 ? "bg-[--sage]" :
                i === round - 1 && running ? "bg-[--turmeric]" :
                "bg-[--line]"
              )}
            />
          ))}
        </div>
        <p className="font-mono text-[0.6rem] text-[--muted] uppercase tracking-wider text-center">
          Progress — {round - 1} of {totalRounds} complete
        </p>
      </div>
    </div>
  );
}
