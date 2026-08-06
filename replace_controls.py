import re

with open('/Users/mahanshgaur/Documents/Gym/Web/apps/web/components/workout/workout-client.tsx', 'r') as f:
    content = f.read()

# 1. Add restartSet function
restart_func = """  const extendRest = useCallback((exKey: string, extraMs: number) => {
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

  const restartSet = useCallback((exKey: string) => {
    onUpdate((s) => {
      const ex = { ...s.exercises[exKey] };
      const nowMs = Date.now();
      if (ex.restStartedAt && ex.restActualMs === null) {
        // Restart rest
        return {
          ...s,
          exercises: { ...s.exercises, [exKey]: { ...ex, restStartedAt: nowMs } }
        };
      } else {
        const activeIdx = ex.sets.findIndex(set => set.status === "active");
        if (activeIdx >= 0) {
          const sets = [...ex.sets];
          sets[activeIdx] = { ...sets[activeIdx], startedAt: nowMs };
          return {
            ...s,
            exercises: { ...s.exercises, [exKey]: { ...ex, sets } }
          };
        }
      }
      return s;
    });
  }, [onUpdate]);"""

content = re.sub(r'  const extendRest = useCallback[\s\S]*?\}, \[onUpdate\]\);', restart_func, content, count=1)

# 2. Add ArrowLeft back button to the top of the card
old_header = """        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="px-3 py-1 rounded-full font-mono text-[0.6rem] uppercase tracking-widest font-semibold" style={{ background: accentRgba, color: accentHex }}>"""

new_header = """        {/* Top bar with back button */}
        <div className="flex items-center justify-between px-4 pt-4 pb-0">
          <button onClick={onDismiss} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} color="rgba(255,255,255,0.7)" />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 pt-2 pb-2">
          <div className="px-3 py-1 rounded-full font-mono text-[0.6rem] uppercase tracking-widest font-semibold" style={{ background: accentRgba, color: accentHex }}>"""

content = content.replace(old_header, new_header)

# 3. Replace controls
old_controls = """        <div className="flex items-center justify-center gap-5 px-6 pb-2">
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
        </div>"""

new_controls = """        <div className="flex items-center justify-center gap-5 px-6 pb-2">
          {isIdle && nextIdleSetIdx >= 0 && (
             <button onClick={() => tapSet(exKey, nextIdleSetIdx)}
               className="px-10 py-3.5 rounded-2xl font-display text-lg transition-all active:scale-95"
               style={{ background: `linear-gradient(135deg, ${accentHex}ee, ${accentHex}bb)`, color: "black", boxShadow: `0 8px 24px ${accentHex}50` }}>
               Start Set {nextIdleSetIdx + 1}
             </button>
          )}

          {!isIdle && (
            <>
              {/* Restart */}
              <button
                onClick={() => restartSet(exKey)}
                className="w-12 h-12 flex-none rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <RotateCcw size={18} color="rgba(255,255,255,0.7)" />
              </button>

              {/* Center button: For timed or rest, it's Play/Pause. For manual work, it's Complete! */}
              {(isWork && !parsed.isTimed) ? (
                 <button onClick={() => tapSet(exKey, activeSetIdx)}
                   className="px-8 py-3.5 flex-1 rounded-2xl font-display text-lg transition-all active:scale-95"
                   style={{ background: `linear-gradient(135deg, ${accentHex}ee, ${accentHex}bb)`, color: "black", boxShadow: `0 8px 24px ${accentHex}50` }}>
                   Complete Set
                 </button>
              ) : (
                <button
                  onClick={status === "active" ? onPause : onResume}
                  className="w-20 h-20 flex-none rounded-full flex items-center justify-center transition-all active:scale-95 shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${accentHex}ee, ${accentHex}bb)`,
                    boxShadow: `0 8px 32px ${accentHex}60, 0 0 0 1px ${accentHex}40`,
                  }}
                >
                  {status === "active"
                    ? <Pause size={30} fill="white" color="white" />
                    : <Play size={30} fill="white" color="white" className="ml-1" />
                  }
                </button>
              )}

              {/* Skip (only for timed or rest) */}
              {(parsed.isTimed || isRest) && (
                <button
                  onClick={() => isWork ? tapSet(exKey, activeSetIdx) : skipRest(exKey)}
                  className="w-12 h-12 flex-none rounded-full flex items-center justify-center transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <SkipForward size={18} color="rgba(255,255,255,0.7)" />
                </button>
              )}
            </>
          )}
        </div>"""

content = content.replace(old_controls, new_controls)

with open('/Users/mahanshgaur/Documents/Gym/Web/apps/web/components/workout/workout-client.tsx', 'w') as f:
    f.write(content)
