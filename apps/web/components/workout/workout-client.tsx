"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Play, Square, Pause, RotateCcw,
  Zap, Clock, Dumbbell, Activity, ArrowLeft, RefreshCw, Coffee,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKOUT_DAYS, type WorkoutDay, type WorkoutBlock } from "@/lib/data";
import {
  parseExMeta, getRestMs, formatMs, sessionKey, initSession,
  loadSession, saveSession, computeStats, getSessionGrade, findActiveSessionDay,
  type WorkoutSession, type ExerciseRecord, type SessionStats,
} from "@/lib/workout-session";

type SessionStatus = "idle" | "active" | "paused" | "done";

// ═══════════════════════════════════════════════════════════════════════════════
// Full-Screen Timer Modal (Apple-style, backdrop blur)
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// Workout Player Modal (Global Apple-style glass overlay)
// ═══════════════════════════════════════════════════════════════════════════════

function WorkoutPlayerModal({
  session, day, tick, onUpdate, onDismiss
}: {
  session: WorkoutSession; day: WorkoutDay; tick: number;
  onUpdate: (updater: (prev: WorkoutSession) => WorkoutSession) => void;
  onDismiss: () => void;
}) {
  const sequence = useMemo(() => {
    const seq: { exKey: string; name: string; meta: string; isWarmup: boolean; isCooldown: boolean }[] = [];
    if (day.warmup) day.warmup.ex.forEach(([name, meta], i) => seq.push({ exKey: `warmup-${i}`, name, meta, isWarmup: true, isCooldown: false }));
    day.blocks?.forEach((b, bi) => {
      b.ex.forEach(([name, meta], i) => seq.push({ exKey: `${bi}-${i}`, name, meta, isWarmup: false, isCooldown: false }));
    });
    if (day.cooldown) day.cooldown.ex.forEach(([name, meta], i) => seq.push({ exKey: `cooldown-${i}`, name, meta, isWarmup: false, isCooldown: true }));
    return seq;
  }, [day]);

  // Find active cursor
  const cursor = useMemo(() => {
    for (const item of sequence) {
      const rec = session.exercises[item.exKey];
      if (!rec) continue;
      if (rec.sets.some(s => s.status === "active") || (rec.restStartedAt && rec.restActualMs === null)) {
        return { ...item, rec };
      }
    }
    for (const item of sequence) {
      const rec = session.exercises[item.exKey];
      if (!rec) continue;
      if (!rec.sets.every(s => s.status === "done")) return { ...item, rec };
    }
    return null;
  }, [sequence, session, tick]);

  const tapSet = useCallback((exKey: string, si: number) => {
    const nowMs = Date.now();
    onUpdate((s) => {
      const ex = { ...s.exercises[exKey] };
      const sets = [...ex.sets];
      const set = { ...sets[si] };
      if (set.status === "idle") {
        if (ex.restStartedAt && ex.restActualMs === null) {
          ex.restActualMs = nowMs - ex.restStartedAt;
          ex.restStartedAt = null;
        }
        set.status = "active";
        set.startedAt = nowMs;
      } else if (set.status === "active") {
        set.status = "done";
        set.completedAt = nowMs;
        set.durationMs = nowMs - (set.startedAt ?? nowMs);
        ex.restStartedAt = nowMs;
        ex.restActualMs = null;
      }
      sets[si] = set;
      ex.sets = sets;
      return { ...s, exercises: { ...s.exercises, [exKey]: ex } };
    });
  }, [onUpdate]);

  const skipRest = useCallback((exKey: string) => {
    onUpdate((s) => {
      const ex = { ...s.exercises[exKey] };
      return {
        ...s,
        exercises: {
          ...s.exercises,
          [exKey]: { ...ex, restActualMs: ex.restStartedAt ? Date.now() - ex.restStartedAt : 0, restStartedAt: null },
        },
      };
    });
  }, [onUpdate]);

  const extendRest = useCallback((exKey: string, extraMs: number) => {
    onUpdate((s) => {
      const ex = { ...s.exercises[exKey] };
      return {
        ...s,
        exercises: {
          ...s.exercises,
          [exKey]: { ...ex, restTargetMs: ex.restTargetMs + extraMs, restExtensions: ex.restExtensions + 1 },
        },
      };
    });
  }, [onUpdate]);

  if (!cursor) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
        style={{ backdropFilter: "blur(60px)", background: "rgba(10,12,14,0.7)" }}>
        <h2 className="text-4xl text-white font-display mb-4">Workout Complete!</h2>
        <button onClick={onDismiss} className="px-8 py-3 bg-[--turmeric] text-black rounded-full font-bold">Close Player</button>
      </motion.div>
    );
  }

  const { name, meta, exKey, rec } = cursor;
  const parsed = parseExMeta(meta);
  const activeSetIdx = rec.sets.findIndex(s => s.status === "active");
  const isResting = rec.restStartedAt !== null && rec.restActualMs === null;
  const nextIdleSetIdx = rec.sets.findIndex(s => s.status === "idle");

  let phase: "idle" | "work" | "rest" = "idle";
  let displaySec = 0;
  let pct = 0;
  
  const now = Date.now();
  if (activeSetIdx >= 0) {
    phase = "work";
    const elapsedSec = Math.floor((now - rec.sets[activeSetIdx].startedAt!) / 1000);
    if (parsed.isTimed && parsed.timedSec) {
      displaySec = Math.max(0, parsed.timedSec - elapsedSec);
      pct = displaySec / parsed.timedSec;
      if (displaySec <= 0) {
        // Auto-complete if timed and time is up
        setTimeout(() => tapSet(exKey, activeSetIdx), 0);
      }
    } else {
      displaySec = elapsedSec;
      pct = 1; // full ring for manual sets
    }
  } else if (isResting) {
    phase = "rest";
    const targetMs = rec.restTargetMs;
    const elapsedMs = now - rec.restStartedAt!;
    displaySec = Math.max(0, Math.ceil((targetMs - elapsedMs) / 1000));
    pct = displaySec / (targetMs / 1000);
    if (displaySec <= 0) {
      // Auto-skip rest when done
      setTimeout(() => skipRest(exKey), 0);
    }
  }

  const svgR = 110, svgCx = 130, svgCy = 130;
  const circ = 2 * Math.PI * svgR;
  const isWork = phase === "work";
  const isRest = phase === "rest";
  const isIdle = phase === "idle";

  const accentHex = isIdle ? "#ff9f0a" : isRest ? "#007aff" : (parsed.isTimed ? "#ff9f0a" : "#34c759");
  const accentRgba = isIdle ? "rgba(255,159,10,0.18)" : isRest ? "rgba(0,122,255,0.18)" : (parsed.isTimed ? "rgba(255,159,10,0.18)" : "rgba(52,199,89,0.18)");
  
  const currentSetDisplay = isWork ? activeSetIdx + 1 : (isRest ? (nextIdleSetIdx > 0 ? nextIdleSetIdx : parsed.setCount) : (nextIdleSetIdx >= 0 ? nextIdleSetIdx + 1 : parsed.setCount));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{ backdropFilter: "blur(60px) saturate(200%) brightness(0.55)", WebkitBackdropFilter: "blur(60px) saturate(200%) brightness(0.55)", background: "rgba(10,12,14,0.5)" }}
    >
      <div className="w-full max-w-sm rounded-[2.5rem] overflow-hidden relative"
        style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 32px 64px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.06) inset", backdropFilter: "blur(20px)" }}>
        
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="px-3 py-1 rounded-full font-mono text-[0.6rem] uppercase tracking-widest font-semibold" style={{ background: accentRgba, color: accentHex }}>
            {isIdle ? "Waiting to Start" : isRest ? "😴 Rest" : "⚡ Active Set"}
          </div>
          <span className="font-mono text-[0.6rem] text-white/40">Set {currentSetDisplay}/{parsed.setCount}</span>
        </div>

        <div className="px-6 pb-1">
          <p className="font-display text-xl text-white/90 leading-tight">{name}</p>
          <p className="font-mono text-xs text-[--turmeric] mt-1">{meta}</p>
        </div>

        <div className="flex flex-col items-center py-4">
          <div className="relative">
            <svg width={260} height={260} className="-rotate-90">
              <circle cx={svgCx} cy={svgCy} r={svgR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
              {!isIdle && (
                <>
                  <circle cx={svgCx} cy={svgCy} r={svgR} fill="none" stroke={accentHex} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - pct)} style={{ filter: `drop-shadow(0 0 12px ${accentHex}80)`, opacity: 0.35 }} />
                  <motion.circle cx={svgCx} cy={svgCy} r={svgR} fill="none" stroke={accentHex} strokeWidth={10} strokeLinecap="round" strokeDasharray={`${circ}`} animate={{ strokeDashoffset: circ * (1 - pct) }} transition={{ duration: 1, ease: "linear" }} />
                </>
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isIdle ? (
                 <span className="tabular-nums font-display leading-none" style={{ fontSize: 48, color: "rgba(255,255,255,0.95)" }}>Ready</span>
              ) : (
                <>
                  <span className="tabular-nums font-display leading-none" style={{ fontSize: 72, color: "rgba(255,255,255,0.95)", letterSpacing: "-2px" }}>
                    {displaySec}
                  </span>
                  <span className="font-mono text-[0.65rem] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>seconds</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-5 px-6 pb-2">
          {isIdle && nextIdleSetIdx >= 0 && (
             <button onClick={() => tapSet(exKey, nextIdleSetIdx)}
               className="px-10 py-3.5 rounded-2xl font-display text-lg transition-all active:scale-95"
               style={{ background: `linear-gradient(135deg, ${accentHex}ee, ${accentHex}bb)`, color: "black", boxShadow: `0 8px 24px ${accentHex}50` }}>
               Start Set {nextIdleSetIdx + 1}
             </button>
          )}
          {isWork && !parsed.isTimed && (
             <button onClick={() => tapSet(exKey, activeSetIdx)}
               className="px-10 py-3.5 rounded-2xl font-display text-lg transition-all active:scale-95"
               style={{ background: `linear-gradient(135deg, ${accentHex}ee, ${accentHex}bb)`, color: "black", boxShadow: `0 8px 24px ${accentHex}50` }}>
               Complete Set
             </button>
          )}
          {isRest && (
             <button onClick={() => skipRest(exKey)}
               className="px-8 py-3.5 rounded-2xl font-display text-lg transition-all active:scale-95"
               style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white" }}>
               Skip Rest
             </button>
          )}
        </div>

        {isRest && (
          <div className="flex gap-3 justify-center pb-5 pt-2">
            <button onClick={() => extendRest(exKey, 30000)} className="px-4 py-2 rounded-xl font-mono text-xs transition-all active:scale-95" style={{ background: "rgba(0,122,255,0.15)", border: "1px solid rgba(0,122,255,0.3)", color: "#007aff" }}>+30s</button>
            <button onClick={() => extendRest(exKey, 60000)} className="px-4 py-2 rounded-xl font-mono text-xs transition-all active:scale-95" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>+1min</button>
          </div>
        )}
        <button onClick={onDismiss} className="w-full py-4 font-mono text-xs transition-colors mt-2" style={{ color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          ↓ Collapse to list
        </button>
      </div>
    </motion.div>
  );
}
// Root exported component
// ═══════════════════════════════════════════════════════════════════════════════

export function WorkoutClient() {
  const [view, setView] = useState<"today" | "week">("today");
  const [selectedWeekDay, setSelectedWeekDay] = useState<number | null>(null);
  const today = new Date().getDay();

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {(["today", "week"] as const).map((v) => (
          <button
            key={v}
            onClick={() => { setView(v); setSelectedWeekDay(null); }}
            className={cn(
              "px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-all",
              view === v
                ? "bg-[--turmeric] text-[--ink] font-bold"
                : "border border-[--line] text-[--muted] hover:border-[--line-strong] hover:text-[--text]"
            )}
          >
            {v === "today" ? "Today" : "This Week"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === "today" ? (
          <motion.div key="today"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            <DayWorkoutView dayIndex={today} />
          </motion.div>
        ) : (
          <motion.div key="week"
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            <WeekView today={today} selectedDay={selectedWeekDay} onSelectDay={setSelectedWeekDay} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Week View — clickable grid + selected day detail
// ═══════════════════════════════════════════════════════════════════════════════

function WeekView({
  today,
  selectedDay,
  onSelectDay,
}: {
  today: number;
  selectedDay: number | null;
  onSelectDay: (d: number | null) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
        {WORKOUT_DAYS.map((d, i) => {
          const isToday = i === today;
          const isSelected = i === selectedDay;
          return (
            <motion.button
              key={i}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectDay(isSelected ? null : i)}
              className={cn(
                "card text-left transition-all duration-200 cursor-pointer hover:border-[--line-strong]",
                isToday && "border-[--turmeric] bg-[rgba(224,168,58,0.04)]",
                isSelected && !isToday && "border-[--sage] bg-[rgba(127,176,140,0.06)]",
              )}
            >
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <span className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted]">
                  {d.name.slice(0, 3)}
                </span>
                <div className="flex gap-1 flex-wrap">
                  {isToday && <span className="badge badge-gold">Today</span>}
                  {d.rest && <span className="badge badge-muted">Rest</span>}
                </div>
              </div>
              <p className="font-display text-base text-[--text] leading-tight">{d.focus}</p>
              <p className="font-mono text-[0.65rem] text-[--muted] mt-1">{d.time}</p>
              {!d.rest && (
                <>
                  <p className="font-mono text-[0.6rem] text-[--muted] mt-0.5">
                    {d.blocks?.length ?? 0} blocks · {d.blocks?.reduce((a, b) => a + b.ex.length, 0)} exercises
                  </p>
                  <p className={cn(
                    "font-mono text-[0.6rem] mt-1 transition-colors",
                    isSelected ? "text-[--sage]" : "text-[--turmeric]"
                  )}>
                    {isSelected ? "▲ Collapse" : "↗ Tap to view"}
                  </p>
                </>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedDay !== null && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => onSelectDay(null)}
                className="flex items-center gap-1.5 text-[--muted] hover:text-[--text] font-mono text-xs transition-colors"
              >
                <ArrowLeft size={14} /> Back to grid
              </button>
              <span className="text-[--line]">|</span>
              <span className="font-display text-xl text-[--text]">
                {WORKOUT_DAYS[selectedDay].name} — {WORKOUT_DAYS[selectedDay].focus}
              </span>
            </div>
            <DayWorkoutView dayIndex={selectedDay} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Day Workout View — session state machine
// ═══════════════════════════════════════════════════════════════════════════════

function DayWorkoutView({ dayIndex }: { dayIndex: number }) {
  const day = WORKOUT_DAYS[dayIndex];
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [tick, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const existing = loadSession(dayIndex);
    if (existing) {
      setSession(existing);
      if (existing.endedAt) setStatus("done");
      else if (existing.pausedAt) setStatus("paused");
      else setStatus("active");
    }
  }, [dayIndex]);

  useEffect(() => {
    if (status === "active") {
      tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [status]);

  const updateSession = useCallback(
    (updater: (prev: WorkoutSession) => WorkoutSession) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        saveSession(next);
        return next;
      });
    },
    []
  );

  const [conflictDay, setConflictDay] = useState<number | null>(null);

  const startSession = useCallback(() => {
    const activeDay = findActiveSessionDay(7);
    if (activeDay !== null && activeDay !== dayIndex) {
      setConflictDay(activeDay);
      return;
    }
    const s = initSession(day, dayIndex);
    saveSession(s);
    setSession(s);
    setStatus("active");
  }, [day, dayIndex]);

  const pauseSession = useCallback(() => {
    updateSession((s) => ({ ...s, pausedAt: Date.now() }));
    setStatus("paused");
  }, [updateSession]);

  const resumeSession = useCallback(() => {
    updateSession((s) => ({
      ...s,
      totalPausedMs: s.totalPausedMs + (s.pausedAt ? Date.now() - s.pausedAt : 0),
      pausedAt: null,
    }));
    setStatus("active");
  }, [updateSession]);

  const endSession = useCallback(() => {
    updateSession((s) => ({
      ...s,
      endedAt: Date.now(),
      totalPausedMs: s.totalPausedMs + (s.pausedAt ? Date.now() - s.pausedAt : 0),
      pausedAt: null,
    }));
    setStatus("done");
  }, [updateSession]);

  const resetSession = useCallback(() => {
    localStorage.removeItem(sessionKey(dayIndex));
    setSession(null);
    setStatus("idle");
  }, [dayIndex]);

  if (day.rest) {
    return (
      <div>
        <div className="card text-center py-12 mb-4">
          <Coffee size={44} className="mx-auto text-[--turmeric] mb-3" />
          <p className="font-display text-4xl text-[--turmeric] mb-2">REST</p>
          <p className="text-[--muted] text-sm max-w-sm mx-auto leading-relaxed">{day.note}</p>
        </div>
        {/* Sunday still has trackable flows */}
        {(status === "idle") && <NotStartedView day={day} onStart={startSession} />}
        {(status === "active" || status === "paused") && session && (
          <ActiveSessionView
            session={session} day={day} status={status} tick={tick}
            onUpdate={updateSession} onPause={pauseSession} onResume={resumeSession} onEnd={endSession}
          />
        )}
        {status === "done" && session && <SessionSummaryView session={session} day={day} onReset={resetSession} />}
      </div>
    );
  }

  if (status === "idle") {
    return (
      <>
        <AnimatePresence>
          {conflictDay !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
              style={{ backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", background: "rgba(0,0,0,0.6)" }}
            >
              <motion.div
                initial={{ y: 40, scale: 0.97 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 40, scale: 0.97 }}
                className="w-full max-w-sm rounded-3xl p-6"
                style={{
                  background: "rgba(30,30,32,0.92)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 32px 64px rgba(0,0,0,0.7)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="text-3xl mb-3">⚠️</div>
                <p className="font-display text-xl text-[--text] mb-2">Workout Already Active</p>
                <p className="font-mono text-sm text-[--muted] mb-5 leading-relaxed">
                  <strong className="text-[--turmeric]">{WORKOUT_DAYS[conflictDay].focus}</strong> is still in progress.
                  You can only have one active workout at a time.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConflictDay(null)}
                    className="flex-1 py-3 rounded-2xl font-mono text-sm border border-[--line] text-[--muted] hover:border-[--line-strong] hover:text-[--text] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <NotStartedView day={day} onStart={startSession} />
      </>
    );
  }

  if ((status === "active" || status === "paused") && session) {
    return (
      <ActiveSessionView
        session={session}
        day={day}
        status={status}
        tick={tick}
        onUpdate={updateSession}
        onPause={pauseSession}
        onResume={resumeSession}
        onEnd={endSession}
      />
    );
  }

  if (status === "done" && session) {
    return <SessionSummaryView session={session} day={day} onReset={resetSession} />;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Not Started View
// ═══════════════════════════════════════════════════════════════════════════════

function NotStartedView({ day, onStart }: { day: WorkoutDay; onStart: () => void }) {
  const totalExercises = (day.blocks?.reduce((a, b) => a + b.ex.length, 0) ?? 0)
    + (day.warmup ? day.warmup.ex.length : 0)
    + (day.cooldown ? day.cooldown.ex.length : 0);
  const totalSets = (day.blocks?.reduce(
    (a, b) => b.ex.reduce((c, [, meta]) => c + parseExMeta(meta).setCount, a), 0
  ) ?? 0)
    + (day.warmup?.ex.reduce((a, [, m]) => a + parseExMeta(m).setCount, 0) ?? 0)
    + (day.cooldown?.ex.reduce((a, [, m]) => a + parseExMeta(m).setCount, 0) ?? 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Day hero card */}
      <div className="card relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ background: "radial-gradient(circle at 20% 50%, var(--turmeric), transparent 70%)" }} />
        <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[--muted] mb-1">
          {day.name} · {day.time}
        </p>
        <h2 className="font-display text-3xl text-[--text] mb-3">{day.focus}</h2>
        <div className="flex gap-2 flex-wrap">
          {[
            { icon: Dumbbell, label: `${day.blocks?.length ?? 0} blocks` },
            { icon: Activity, label: `${totalExercises} exercises` },
            { icon: Zap, label: `${totalSets} total sets` },
            { icon: Clock, label: day.time },
          ].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 font-mono text-[0.65rem] text-[--muted] bg-[--panel-2] px-2.5 py-1.5 rounded-lg">
              <Icon size={12} className="text-[--turmeric]" /> {label}
            </span>
          ))}
        </div>
      </div>

      {/* Warmup preview */}
      {day.warmup && (
        <div className="card py-3 px-4 border-[rgba(224,168,58,0.2)]">
          <p className="font-mono text-[0.6rem] uppercase tracking-wider text-[--turmeric] mb-2">🔥 {day.warmup.label}</p>
          <div className="space-y-1">
            {day.warmup.ex.map(([name, meta], ei) => (
              <div key={ei} className="flex items-center gap-2 text-sm">
                <span className="text-[--muted] flex-1 truncate">{name}</span>
                <span className="font-mono text-[0.6rem] text-[--turmeric] flex-none">{meta}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block preview */}
      {day.blocks?.map((block, bi) => (
        <div key={bi} className="card py-3 px-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-wider text-[--turmeric] mb-2">{block.label}</p>
          <div className="space-y-1.5">
            {block.ex.map(([name, meta], ei) => {
              const p = parseExMeta(meta);
              return (
                <div key={ei} className="flex items-center gap-2 text-sm">
                  <span className="text-[--text] flex-1 min-w-0 break-words">{name}</span>
                  <span className="font-mono text-[0.6rem] text-[--muted] flex-none">
                    {p.setCount > 1 ? `${p.setCount}×` : ""} {p.isTimed ? "⏱" : ""}
                  </span>
                  <span className="font-mono text-[0.6rem] text-[--turmeric] flex-none">{p.repsStr}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Cooldown preview */}
      {day.cooldown && (
        <div className="card py-3 px-4 border-[rgba(127,176,140,0.2)]">
          <p className="font-mono text-[0.6rem] uppercase tracking-wider text-[--sage] mb-2">❄️ {day.cooldown.label}</p>
          <div className="space-y-1">
            {day.cooldown.ex.map(([name, meta], ei) => (
              <div key={ei} className="flex items-center gap-2 text-sm">
                <span className="text-[--muted] flex-1 truncate">{name}</span>
                <span className="font-mono text-[0.6rem] text-[--sage] flex-none">{meta}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start button */}
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="w-full py-5 rounded-2xl bg-[--turmeric] text-[--ink] font-display text-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-[rgba(224,168,58,0.25)]"
      >
        <Play size={28} fill="currentColor" />
        Start Workout
      </motion.button>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Active Session View
// ═══════════════════════════════════════════════════════════════════════════════

function ActiveSessionView({
  session, day, status, tick, onUpdate, onPause, onResume, onEnd,
}: {
  session: WorkoutSession;
  day: WorkoutDay;
  status: "active" | "paused";
  tick: number;
  onUpdate: (updater: (prev: WorkoutSession) => WorkoutSession) => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}) {
  
  const stats = useMemo(() => computeStats(session), [session, tick]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showPlayer, setShowPlayer] = useState(true);


  const elapsedMs =
    status === "paused"
      ? (session.pausedAt ?? Date.now()) - session.startedAt - session.totalPausedMs
      : Date.now() - session.startedAt - session.totalPausedMs;

  return (
    <div className="space-y-4 pb-36">
      {/* Sticky session header */}
      <div className="card bg-[rgba(224,168,58,0.06)] border-[--turmeric] sticky top-0 z-20 shadow-md" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[--turmeric]">
              {status === "paused" ? "⏸ Paused" : "● Live Session"}
            </p>
            <p className="font-display text-4xl text-[--text] tabular-nums leading-none">
              {formatMs(elapsedMs)}
            </p>
            <p className="font-mono text-xs text-[--muted] mt-0.5 truncate">{day.focus}</p>
          </div>
          <div className="flex items-center gap-3 flex-none">
            <ProgressRing done={stats.setsDone} total={stats.setsTotal} />
            <div className="flex flex-col gap-1.5">
              {status === "active" ? (
                <button onClick={onPause}
                  className="p-2 rounded-xl border border-[--line] text-[--muted] hover:border-[--turmeric] hover:text-[--turmeric] transition-colors">
                  <Pause size={16} />
                </button>
              ) : (
                <button onClick={onResume}
                  className="p-2 rounded-xl bg-[--turmeric] text-[--ink]">
                  <Play size={16} fill="currentColor" />
                </button>
              )}
              <button onClick={() => setShowEndConfirm(true)}
                className="p-2 rounded-xl border border-[rgba(201,96,63,0.4)] text-[--paprika] hover:bg-[rgba(201,96,63,0.1)] transition-colors">
                <Square size={16} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-[rgba(232,229,217,0.08)] overflow-hidden">
          <motion.div
            className="h-full bg-[--turmeric] rounded-full"
            animate={{ width: stats.setsTotal > 0 ? `${(stats.setsDone / stats.setsTotal) * 100}%` : "0%" }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="font-mono text-[0.6rem] text-[--muted] mt-1">
          {stats.setsDone}/{stats.setsTotal} sets · ETA {formatMs(Math.max(0, stats.etaMs))} remaining
        </p>
      </div>

      
      <AnimatePresence>
        {showPlayer && (
          <WorkoutPlayerModal session={session} day={day} tick={tick} onUpdate={onUpdate} onDismiss={() => setShowPlayer(false)} />
        )}
      </AnimatePresence>
      {/* End confirm */}

      <AnimatePresence>
        {showEndConfirm && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card border-[--paprika] bg-[rgba(201,96,63,0.05)]">
            <p className="font-display text-lg text-[--text] mb-1">End session?</p>
            <p className="text-sm text-[--muted] mb-3">Progress saved. Analytics will be generated.</p>
            <div className="flex gap-2">
              <button onClick={onEnd}
                className="px-4 py-2 rounded-full bg-[--paprika] text-white font-mono text-xs uppercase tracking-wide">
                End & Save
              </button>
              <button onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2 rounded-full border border-[--line] text-[--muted] font-mono text-xs uppercase tracking-wide">
                Keep Going
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warmup block */}
      {day.warmup && (
        <ExerciseBlock
          block={day.warmup}
          blockKey="warmup"
          accentColor="var(--turmeric)"
          accentLabel="🔥 Warm-up"
          session={session}
          onUpdate={onUpdate}
          tick={tick}
          status={status}
        />
      )}

      {/* Main exercise blocks */}
      {day.blocks?.map((block, bi) => (
        <ExerciseBlock
          key={bi}
          block={block}
          blockKey={`${bi}`}
          accentColor="var(--turmeric)"
          session={session}
          onUpdate={onUpdate}
          tick={tick}
          status={status}
        />
      ))}

      {/* Cooldown block */}
      {day.cooldown && (
        <ExerciseBlock
          block={day.cooldown}
          blockKey="cooldown"
          accentColor="var(--sage)"
          accentLabel="❄️ Cooldown"
          session={session}
          onUpdate={onUpdate}
          tick={tick}
          status={status}
        />
      )}

      {/* Live analytics bar */}
      <LiveAnalyticsBar stats={stats} status={status} />
    </div>
  );
}

// ── Progress ring SVG ──────────────────────────────────────────────────────────

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = 22, cx = 26, cy = 26;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={52} height={52} className="-rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(232,229,217,0.08)" strokeWidth={4} />
      <motion.circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="var(--turmeric)" strokeWidth={4} strokeLinecap="round"
        strokeDasharray={`${circ}`}
        animate={{ strokeDashoffset: circ - circ * pct }}
        transition={{ duration: 0.5 }}
      />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fill="var(--text)"
        style={{ fontSize: 9, fontFamily: "var(--font-mono)", transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px` }}>
        {done}/{total}
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exercise Block
// ═══════════════════════════════════════════════════════════════════════════════

function ExerciseBlock({
  block, blockKey, session, onUpdate, tick, status, accentColor, accentLabel,
}: {
  block: WorkoutBlock;
  blockKey: string;
  session: WorkoutSession;
  onUpdate: (updater: (prev: WorkoutSession) => WorkoutSession) => void;
  tick: number;
  status: "active" | "paused";
  accentColor?: string;
  accentLabel?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const blockDone = block.ex.every((_, ei) => {
    const rec = session.exercises[`${blockKey}-${ei}`];
    return rec ? rec.sets.every((s) => s.status === "done") : false;
  });

  return (
    <motion.div layout className={cn("card transition-colors duration-300", blockDone && "border-[--sage] bg-[rgba(127,176,140,0.04)]")}>
      <button onClick={() => setCollapsed((c) => !c)} className="w-full flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className={cn("w-5 h-5 rounded-full border-2 flex-none flex items-center justify-center transition-colors",
            blockDone ? "border-[--sage] bg-[--sage]" : "border-[--line]")}>
            {blockDone && (
              <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
                <path d="M5 10l4 4 6-7" stroke="#09181a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className={cn("font-medium text-sm", blockDone ? "text-[--sage]" : "text-[--text]")}>
            {accentLabel ?? block.label}
          </span>
        </div>
        {collapsed
          ? <ChevronDown size={16} className="text-[--muted] flex-none" />
          : <ChevronUp size={16} className="text-[--muted] flex-none" />}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden">
            <div className="pt-3 space-y-3">
              {block.ex.map(([name, meta], ei) => {
                const exKey = `${blockKey}-${ei}`;
                const record = session.exercises[exKey];
                if (!record) return null;
                return (
                  <ExerciseRow
                    key={ei}
                    name={name}
                    meta={meta}
                    exKey={exKey}
                    record={record}
                    onUpdate={onUpdate}
                    tick={tick}
                    status={status}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exercise Row — sets, timers, analytics
// ═══════════════════════════════════════════════════════════════════════════════

function ExerciseRow({
  name, meta, exKey, record, onUpdate, tick, status,
}: {
  name: string;
  meta: string;
  exKey: string;
  record: ExerciseRecord;
  onUpdate: (updater: (prev: WorkoutSession) => WorkoutSession) => void;
  tick: number;
  status: "active" | "paused";
}) {
  const parsed = useMemo(() => parseExMeta(meta), [meta]);
  const allDone = record.sets.every((s) => s.status === "done");
  const hasActive = record.sets.some((s) => s.status === "active");
  const isResting = record.restStartedAt !== null && record.restActualMs === null;
  
  const now = Date.now();
  const activeSetIdx = record.sets.findIndex((s) => s.status === "active");
  const activeElapsedMs = activeSetIdx >= 0 && record.sets[activeSetIdx].startedAt
    ? now - record.sets[activeSetIdx].startedAt! : 0;
  const restRemaining = isResting && record.restStartedAt
    ? record.restTargetMs - (now - record.restStartedAt) : 0;



  // Mark a set as done and start rest timer
  const completeSet = useCallback((si: number) => {
    const completedAt = Date.now();
    onUpdate((session) => {
      const ex = { ...session.exercises[exKey] };
      const sets = [...ex.sets];
      const set = { ...sets[si] };
      set.status = "done";
      set.completedAt = completedAt;
      set.durationMs = completedAt - (set.startedAt ?? completedAt);
      sets[si] = set;
      ex.sets = sets;
      // Start rest timer
      ex.restStartedAt = completedAt;
      ex.restActualMs = null;
      return { ...session, exercises: { ...session.exercises, [exKey]: ex } };
    });
  }, [exKey, onUpdate]);

  const tapSet = useCallback((si: number) => {
    if (status === "paused") return;
    const nowMs = Date.now();
    onUpdate((session) => {
      const ex = { ...session.exercises[exKey] };
      const sets = [...ex.sets];
      const set = { ...sets[si] };
      if (set.status === "idle") {
        // End any active rest
        if (ex.restStartedAt && ex.restActualMs === null) {
          ex.restActualMs = nowMs - ex.restStartedAt;
          ex.restStartedAt = null;
        }
        set.status = "active";
        set.startedAt = nowMs;
      } else if (set.status === "active") {
        set.status = "done";
        set.completedAt = nowMs;
        set.durationMs = nowMs - (set.startedAt ?? nowMs);
        ex.restStartedAt = nowMs;
        ex.restActualMs = null;
      }
      sets[si] = set;
      ex.sets = sets;
      return { ...session, exercises: { ...session.exercises, [exKey]: ex } };
    });
  }, [exKey, onUpdate, status]);

  const extendRest = useCallback((extraMs: number) => {
    onUpdate((session) => {
      const ex = { ...session.exercises[exKey] };
      return {
        ...session,
        exercises: {
          ...session.exercises,
          [exKey]: { ...ex, restTargetMs: ex.restTargetMs + extraMs, restExtensions: ex.restExtensions + 1 },
        },
      };
    });
  }, [exKey, onUpdate]);

  const skipRest = useCallback(() => {
    onUpdate((session) => {
      const ex = { ...session.exercises[exKey] };
      return {
        ...session,
        exercises: {
          ...session.exercises,
          [exKey]: {
            ...ex,
            restActualMs: ex.restStartedAt ? Date.now() - ex.restStartedAt : 0,
            restStartedAt: null,
          },
        },
      };
    });
  }, [exKey, onUpdate]);

  // Find the next idle set index
  const nextIdleSetIdx = record.sets.findIndex((s) => s.status === "idle");

  return (
    <>


      <div className={cn(
        "rounded-2xl border p-4 transition-all duration-300",
        allDone ? "border-[rgba(127,176,140,0.3)] bg-[rgba(127,176,140,0.03)]" :
          hasActive ? "border-[rgba(224,168,58,0.5)] bg-[rgba(224,168,58,0.04)]" :
            isResting ? "border-[rgba(96,165,250,0.35)] bg-[rgba(96,165,250,0.03)]" :
              "border-[--line]"
      )}>
        {/* Header */}
        <div className="flex items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className={cn("font-medium text-sm leading-snug",
              allDone ? "text-[--sage] line-through" : "text-[--text]")}>
              {name}
            </p>
            <p className="font-mono text-[0.65rem] text-[--turmeric] mt-0.5">
              {meta}{parsed.isTimed ? " · ⏱ Timed" : ""}
            </p>
          </div>
          {allDone && (
            <div className="flex-none flex flex-col items-end gap-0.5">
              <span className="font-mono text-[0.55rem] text-[--sage]">✓ Done</span>
              {record.sets.length > 0 && (
                <span className="font-mono text-[0.55rem] text-[--muted]">
                  avg {formatMs(record.sets.reduce((a, s) => a + (s.durationMs ?? 0), 0) / record.sets.length)}
                </span>
              )}
            </div>
          )}
          {/* Tap-to-start hint for timed exercises */}
          {parsed.isTimed && !allDone && !hasActive && parsed.timedSec && (
            <span className="flex-none ml-2 font-mono text-[0.55rem] text-[--turmeric] opacity-70">
              ⏱ tap to start
            </span>
          )}
        </div>

        {/* Set chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {record.sets.map((set, si) => {
            const isDone = set.status === "done";
            const isActive = set.status === "active";
            const locked = set.status === "idle" && si > 0 && record.sets[si - 1].status !== "done";
            const elapsed = isActive && set.startedAt ? (Date.now() + tick * 0 - set.startedAt) : 0;

            const targetOverrun = isDone && parsed.timedSec && set.durationMs
              ? set.durationMs > parsed.timedSec * 1000 + 8000
              : false;

            return (
              <motion.button
                key={si}
                whileTap={{ scale: 0.92 }}
                onClick={() => !locked && tapSet(si)}
                disabled={locked || status === "paused"}
                className={cn(
                  "flex flex-col items-center px-3 py-2 rounded-xl font-mono text-xs transition-all duration-200 min-w-[56px]",
                  isDone
                    ? targetOverrun
                      ? "bg-[rgba(201,96,63,0.15)] border border-[--paprika] text-[--paprika]"
                      : "bg-[rgba(127,176,140,0.15)] border border-[--sage] text-[--sage]"
                    : isActive
                      ? "bg-[rgba(224,168,58,0.2)] border border-[--turmeric] text-[--turmeric]"
                      : locked
                        ? "bg-[--panel-2] border border-[--line] text-[--line] opacity-30 cursor-not-allowed"
                        : "bg-[--panel-2] border border-[--line] text-[--muted] hover:border-[--turmeric] hover:text-[--text] cursor-pointer"
                )}
              >
                <span className="text-[0.55rem] uppercase tracking-wider mb-0.5">
                  {isDone ? "✓" : isActive ? "●" : `Set ${si + 1}`}
                </span>
                <span className="tabular-nums text-[0.7rem]">
                  {isDone && set.durationMs
                    ? formatMs(set.durationMs)
                    : isActive
                      ? formatMs(elapsed)
                      : parsed.timedSec
                        ? `${parsed.timedSec}s`
                        : `${si + 1}`}
                </span>
                {isDone && parsed.timedSec && set.durationMs && (
                  <span className={cn("text-[0.5rem] mt-0.5",
                    targetOverrun ? "text-[--paprika]" : "text-[--sage]")}>
                    {targetOverrun ? `+${Math.round((set.durationMs - parsed.timedSec * 1000) / 1000)}s` : "✓ Time"}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Inline set analytics */}
        {record.sets.some((s) => s.status === "done") && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {record.sets.map((s, si) => {
              if (s.status !== "done" || !s.durationMs) return null;
              const target = parsed.estimatedSetMs;
              const diff = s.durationMs - target;
              const good = Math.abs(diff) < 10_000;
              return (
                <span key={si}
                  className={cn("font-mono text-[0.55rem] px-2 py-0.5 rounded-full",
                    good
                      ? "text-[--sage] bg-[rgba(127,176,140,0.1)]"
                      : diff > 0
                        ? "text-[--paprika] bg-[rgba(201,96,63,0.1)]"
                        : "text-[--turmeric] bg-[rgba(224,168,58,0.1)]")}>
                  S{si + 1}: {formatMs(s.durationMs)} {good ? "✓" : diff > 0 ? `+${Math.round(diff / 1000)}s slow` : `${Math.round(-diff / 1000)}s fast`}
                </span>
              );
            })}
            {record.restExtensions > 0 && (
              <span className="font-mono text-[0.55rem] px-2 py-0.5 rounded-full text-[--paprika] bg-[rgba(201,96,63,0.08)]">
                +{record.restExtensions} rest ext.
              </span>
            )}
          </div>
        )}

        {/* Rest countdown */}
        <AnimatePresence>
          {isResting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden">
              <RestCountdown
                restRemaining={restRemaining}
                restTargetMs={record.restTargetMs}
                restExtensions={record.restExtensions}
                onExtend={extendRest}
                onSkip={skipRest}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rest Countdown
// ═══════════════════════════════════════════════════════════════════════════════

function RestCountdown({
  restRemaining, restTargetMs, restExtensions, onExtend, onSkip,
}: {
  restRemaining: number;
  restTargetMs: number;
  restExtensions: number;
  onExtend: (ms: number) => void;
  onSkip: () => void;
}) {
  const pct = Math.max(0, Math.min(1, restRemaining / restTargetMs));
  const overdue = restRemaining <= 0;
  const r = 26, cx = 30, cy = 30;
  const circ = 2 * Math.PI * r;

  return (
    <div className="mt-2 p-3 rounded-xl bg-[rgba(96,165,250,0.06)] border border-[rgba(96,165,250,0.2)]">
      <div className="flex items-center gap-4">
        <svg width={60} height={60} className="-rotate-90 flex-none">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(96,165,250,0.12)" strokeWidth={4} />
          <motion.circle cx={cx} cy={cy} r={r} fill="none"
            stroke={overdue ? "var(--turmeric)" : "rgb(96,165,250)"}
            strokeWidth={4} strokeLinecap="round"
            strokeDasharray={`${circ}`}
            animate={{ strokeDashoffset: circ * (1 - pct) }}
            transition={{ duration: 0.5 }}
          />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
            fill={overdue ? "var(--turmeric)" : "rgb(96,165,250)"}
            style={{ fontSize: 10, fontFamily: "var(--font-mono)", transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px` }}>
            {overdue ? "Go!" : formatMs(restRemaining)}
          </text>
        </svg>

        <div className="flex-1 min-w-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-0.5">
            {overdue ? "⚡ Rest over — start next set" : "😴 Resting"}
          </p>
          <p className="font-mono text-[0.6rem] text-[--muted]">
            {formatMs(restTargetMs)} prescribed
            {restExtensions > 0 && ` · Extended ${restExtensions}×`}
          </p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => onExtend(30_000)}
              className="px-2.5 py-1 rounded-full border border-[rgba(96,165,250,0.3)] text-[rgb(96,165,250)] font-mono text-[0.6rem] hover:bg-[rgba(96,165,250,0.1)] transition-colors">
              + 30s
            </button>
            <button onClick={() => onExtend(60_000)}
              className="px-2.5 py-1 rounded-full border border-[rgba(96,165,250,0.2)] text-[--muted] font-mono text-[0.6rem] hover:border-[rgba(96,165,250,0.4)] transition-colors">
              + 1min
            </button>
            <button onClick={onSkip}
              className="px-2.5 py-1 rounded-full border border-[--line] text-[--muted] font-mono text-[0.6rem] hover:border-[--turmeric] hover:text-[--turmeric] transition-colors">
              Skip →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Live Analytics Bar — sticky bottom with backdrop blur
// ═══════════════════════════════════════════════════════════════════════════════

function LiveAnalyticsBar({ stats, status }: { stats: SessionStats; status: string }) {
  const [expanded, setExpanded] = useState(false);

  const analyticsItems = [
    { label: "Sets", val: `${stats.setsDone}/${stats.setsTotal}`, sub: "completed", color: "text-[--turmeric]" },
    { label: "Efficiency", val: `${stats.efficiencyPct}%`, sub: "vs planned pace", color: stats.efficiencyPct >= 80 ? "text-[--sage]" : "text-[--paprika]" },
    { label: "Avg Set", val: formatMs(stats.avgSetMs), sub: "per set", color: "text-[--text]" },
    { label: "Rest Taken", val: formatMs(stats.totalRestMs), sub: "total", color: "text-[rgb(96,165,250)]" },
    { label: "ETA Left", val: formatMs(Math.max(0, stats.etaMs)), sub: "to finish", color: "text-[--muted]" },
    { label: "Rest Ext.", val: `${stats.restExtensions}×`, sub: "extensions", color: stats.restExtensions > 3 ? "text-[--paprika]" : "text-[--muted]" },
  ];

  return (
    <div className="fixed bottom-[64px] left-0 right-0 z-30 px-3 md:left-[260px]">
      <motion.div
        layout
        className="rounded-2xl border border-[--line]/60 overflow-hidden shadow-2xl shadow-black/50"
        style={{ backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", background: "rgba(9,24,26,0.75)" }}
      >
        <button onClick={() => setExpanded((e) => !e)} className="w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Activity size={11} className="text-[--turmeric]" />
                <span className="font-mono text-xs text-[--text] tabular-nums">
                  {stats.setsDone}/{stats.setsTotal} sets
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={11} className="text-[--sage]" />
                <span className="font-mono text-xs text-[--text]">{stats.efficiencyPct}% eff</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-[rgb(96,165,250)]" />
                <span className="font-mono text-xs text-[--muted]">ETA {formatMs(Math.max(0, stats.etaMs))}</span>
              </div>
            </div>
            <span className="font-mono text-[0.6rem] text-[--muted]">
              {expanded ? "▼" : "▲"} Analytics
            </span>
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
              className="overflow-hidden px-4 pb-4">
              <div className="border-t border-[--line] pt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                {analyticsItems.map(({ label, val, sub, color }) => (
                  <div key={label} className="bg-[rgba(232,229,217,0.05)] rounded-xl p-2.5 text-center">
                    <p className="font-mono text-[0.5rem] uppercase tracking-wider text-[--muted] mb-1">{label}</p>
                    <p className={cn("font-display text-lg leading-none", color)}>{val}</p>
                    {sub && <p className="font-mono text-[0.5rem] text-[--muted] mt-0.5">{sub}</p>}
                  </div>
                ))}
              </div>
              {stats.restExtensions > 2 && (
                <p className="font-mono text-[0.6rem] text-[--paprika] mt-2">
                  ⚠ Taking more rest than planned — consider reducing load.
                </p>
              )}
              {stats.efficiencyPct >= 95 && (
                <p className="font-mono text-[0.6rem] text-[--sage] mt-2">
                  🔥 You're ahead of pace — great tempo!
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Session Summary View — grades, fatigue curve, exercise breakdown
// ═══════════════════════════════════════════════════════════════════════════════

function SessionSummaryView({
  session, day, onReset,
}: {
  session: WorkoutSession;
  day: WorkoutDay;
  onReset: () => void;
}) {
  const stats = useMemo(() => computeStats(session), [session]);
  const grade = getSessionGrade(stats);
  const totalMs = (session.endedAt ?? Date.now()) - session.startedAt - session.totalPausedMs;

  // Build ordered fatigue curve data
  const fatigueCurve: { ms: number; label: string; bi: number }[] = [];
  (day.blocks ?? []).forEach((block, bi) => {
    block.ex.forEach(([name], ei) => {
      const rec = session.exercises[`${bi}-${ei}`];
      if (!rec) return;
      rec.sets.forEach((s, si) => {
        if (s.durationMs) {
          fatigueCurve.push({
            ms: s.durationMs,
            label: `${name.split(" ")[0]} S${si + 1}`,
            bi,
          });
        }
      });
    });
  });
  const maxMs = Math.max(...fatigueCurve.map((f) => f.ms), 1);

  // Build all exercise breakdown including warmup & cooldown
  const allBlocks: { label: string; key: string; block: WorkoutBlock }[] = [];
  if (day.warmup) allBlocks.push({ label: "Warm-up", key: "warmup", block: day.warmup });
  (day.blocks ?? []).forEach((b, bi) => allBlocks.push({ label: b.label, key: `${bi}`, block: b }));
  if (day.cooldown) allBlocks.push({ label: "Cooldown", key: "cooldown", block: day.cooldown });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-8">
      {/* Grade hero */}
      <div className="card text-center py-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${grade.color}15, transparent 70%)` }} />
        <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[--muted] mb-2">Session Complete</p>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="font-display text-9xl mb-2 leading-none"
          style={{ color: grade.color }}>
          {grade.grade}
        </motion.div>
        <p className="font-display text-2xl text-[--text]">{grade.desc}</p>
        <p className="font-mono text-xs text-[--muted] mt-2">{day.focus} · {formatMs(totalMs)}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Duration", val: formatMs(totalMs), color: "var(--turmeric)" },
          { label: "Sets Done", val: `${stats.setsDone}/${stats.setsTotal}`, color: "var(--sage)" },
          { label: "Rest Taken", val: formatMs(stats.totalRestMs), color: "rgb(96,165,250)" },
          { label: "Efficiency", val: `${stats.efficiencyPct}%`, color: grade.color },
        ].map(({ label, val, color }) => (
          <div key={label} className="card text-center">
            <p className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted] mb-1">{label}</p>
            <p className="font-display text-3xl" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Fatigue curve */}
      {fatigueCurve.length >= 3 && (
        <div className="card">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-1">
            Fatigue Curve
          </p>
          <p className="font-mono text-[0.6rem] text-[--muted] mb-3">
            Set durations in order — rising bars = slowing down (fatigue)
          </p>
          <div className="flex items-end gap-0.5 h-24 rounded-lg overflow-hidden">
            {fatigueCurve.map(({ ms, label, bi }, i) => {
              const h = ms / maxMs;
              const isLate = i >= fatigueCurve.length * 0.65 && h > 0.8;
              const colors = ["var(--turmeric)", "var(--sage)", "rgb(96,165,250)", "var(--paprika)"];
              const col = isLate ? "var(--paprika)" : colors[bi % colors.length];
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative h-full">
                  <div className="absolute bottom-full mb-1 hidden group-hover:flex bg-[--panel] border border-[--line] rounded px-2 py-1 font-mono text-[0.55rem] text-[--text] whitespace-nowrap z-10 shadow-lg">
                    {label}: {formatMs(ms)}
                  </div>
                  <div className="w-full mt-auto rounded-t-sm transition-all" style={{ height: `${h * 100}%`, background: col }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[0.5rem] text-[--muted]">← Start</span>
            <span className="font-mono text-[0.5rem] text-[--muted]">End →</span>
          </div>
          {fatigueCurve.length > 3 && (
            <p className="font-mono text-[0.6rem] text-[--muted] mt-2">
              {fatigueCurve[fatigueCurve.length - 1].ms > fatigueCurve[0].ms * 1.35
                ? "⚠️ Significant fatigue — sets slowed ~" + Math.round(((fatigueCurve[fatigueCurve.length - 1].ms / fatigueCurve[0].ms) - 1) * 100) + "% toward the end."
                : "✓ Excellent consistency — minimal fatigue drop across the session."}
            </p>
          )}
        </div>
      )}

      {/* Per-exercise breakdown (all blocks including warmup/cooldown) */}
      <div className="card">
        <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-3">
          Exercise Breakdown
        </p>
        <div className="space-y-0">
          {allBlocks.flatMap(({ block, key, label: blockLabel }) =>
            block.ex.map(([name, meta], ei) => {
              const rec = session.exercises[`${key}-${ei}`];
              if (!rec) return null;
              const done = rec.sets.filter((s) => s.status === "done");
              const avgMs = done.length > 0 ? done.reduce((a, s) => a + (s.durationMs ?? 0), 0) / done.length : 0;
              const parsedMeta = parseExMeta(meta);
              return (
                <div key={`${key}-${ei}`}
                  className="flex items-center gap-3 py-3 border-b border-[--line] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[--text] break-words">{name}</p>
                    <p className="font-mono text-[0.6rem] text-[--muted]">{meta}</p>
                  </div>
                  <div className="flex gap-3 flex-none text-right">
                    <div>
                      <p className="font-display text-lg text-[--turmeric]">{done.length}/{rec.sets.length}</p>
                      <p className="font-mono text-[0.5rem] text-[--muted]">sets</p>
                    </div>
                    {avgMs > 0 && (
                      <div>
                        <p className="font-display text-lg text-[--text]">{formatMs(avgMs)}</p>
                        <p className="font-mono text-[0.5rem] text-[--muted]">avg/set</p>
                      </div>
                    )}
                    {rec.restExtensions > 0 && (
                      <div>
                        <p className="font-display text-lg text-[--paprika]">+{rec.restExtensions}</p>
                        <p className="font-mono text-[0.5rem] text-[--muted]">rest ext</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Action */}
      <button
        onClick={onReset}
        className="w-full py-3.5 rounded-xl border border-[--line] text-[--muted] font-mono text-sm hover:border-[--turmeric] hover:text-[--turmeric] transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw size={14} /> Start New Session
      </button>
    </motion.div>
  );
}
