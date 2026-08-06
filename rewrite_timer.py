import re

with open('/Users/mahanshgaur/Documents/Gym/Web/apps/web/components/workout/workout-client.tsx', 'r') as f:
    content = f.read()

# 1. Replace FullScreenTimerModal definition with WorkoutPlayerModal
# First, find where FullScreenTimerModal starts and ends.
start_idx = content.find('interface FullScreenTimerProps')
end_idx = content.find('// Root exported component', start_idx)

player_code = """
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
"""

content = content[:start_idx] + player_code + content[end_idx:]

# 2. Add showPlayer state and Player button to ActiveSessionView
active_session_start = content.find('function ActiveSessionView({')
active_session_header = content.find('<div className="min-w-0">', active_session_start)

active_session_vars = """
  const stats = useMemo(() => computeStats(session), [session, tick]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
"""
content = re.sub(r'const stats = useMemo\(\(\) => computeStats\(session\), \[session, tick\]\);\n  const \[showEndConfirm, setShowEndConfirm\] = useState\(false\);', active_session_vars, content)

player_button = """
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
              <button onClick={() => setShowPlayer(true)}
                className="p-2 rounded-xl bg-[rgba(224,168,58,0.15)] text-[--turmeric] hover:bg-[--turmeric] hover:text-[--ink] transition-colors">
                <Clock size={16} />
              </button>
              <button onClick={() => setShowEndConfirm(true)}
"""
content = re.sub(r'\{status === "active" \? \([\s\S]*?\{Square size=\{16\} fill="currentColor" \/>\n              <\/button>', player_button + '                <Square size={16} fill="currentColor" />\n              </button>', content)

player_render = """
      <AnimatePresence>
        {showPlayer && (
          <WorkoutPlayerModal session={session} day={day} tick={tick} onUpdate={onUpdate} onDismiss={() => setShowPlayer(false)} />
        )}
      </AnimatePresence>
      {/* End confirm */}
"""
content = content.replace('{/* End confirm */}', player_render)

# 3. Remove old full screen timer from ExerciseRow
ex_row_effect = """  // Auto-open fullscreen when timed set starts
  useEffect(() => {
    if (!parsed.isTimed || !parsed.timedSec) return;
    const hasActiveSet = record.sets.some((s) => s.status === "active");
    if (hasActiveSet && !allDone) {
      setShowFullScreenTimer(true);
    }
  }, [record.sets, parsed.isTimed, parsed.timedSec, allDone]);"""

content = content.replace(ex_row_effect, "")
content = re.sub(r'const \[showFullScreenTimer, setShowFullScreenTimer\] = useState\(false\);\n', '', content)

ex_row_render = """      <AnimatePresence>
        {showFullScreenTimer && parsed.isTimed && parsed.timedSec && (
          <FullScreenTimerModal
            exerciseName={name}
            timedSec={parsed.timedSec}
            roundCount={parsed.setCount}
            onSetComplete={() => {
              // Mark all sets as done when fullscreen timer finishes
              const nowMs = Date.now();
              onUpdate((session) => {
                const ex = { ...session.exercises[exKey] };
                const sets = ex.sets.map((s) => {
                  if (s.status !== "done") {
                    return { ...s, status: "done" as const, completedAt: nowMs, durationMs: parsed.timedSec! * 1000 };
                  }
                  return s;
                });
                ex.sets = sets;
                ex.restStartedAt = nowMs;
                ex.restActualMs = null;
                return { ...session, exercises: { ...session.exercises, [exKey]: ex } };
              });
            }}
            onDismiss={() => setShowFullScreenTimer(false)}
          />
        )}
      </AnimatePresence>"""

content = content.replace(ex_row_render, "")

with open('/Users/mahanshgaur/Documents/Gym/Web/apps/web/components/workout/workout-client.tsx', 'w') as f:
    f.write(content)

print("Rewrite complete")
