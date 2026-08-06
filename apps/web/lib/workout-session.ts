// ============================================================
// Workout Session — types, parsers, and utilities
// ============================================================

export type SetStatus = 'idle' | 'active' | 'done';

export interface SetRecord {
  status: SetStatus;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
}

export interface ExerciseRecord {
  key: string;
  sets: SetRecord[];
  restTargetMs: number;
  restStartedAt: number | null;
  restExtensions: number;
  restActualMs: number | null;
  isTimed: boolean;
  timedSec: number | null;
  setCount: number;
}

export interface WorkoutSession {
  dayIndex: number;
  startedAt: number;
  endedAt: number | null;
  exercises: Record<string, ExerciseRecord>;
  pausedAt: number | null;
  totalPausedMs: number;
}

export interface ParsedMeta {
  setCount: number;
  repsStr: string;
  isTimed: boolean;
  timedSec: number | null;
  estimatedSetMs: number;
}

export interface SessionStats {
  elapsedMs: number;
  setsTotal: number;
  setsDone: number;
  setsActive: number;
  avgSetMs: number;
  totalRestMs: number;
  prescribedRestMs: number;
  restExtensions: number;
  etaMs: number;
  efficiencyPct: number;
}

// ── Parse exercise meta string ──────────────────────────────────────────────────

export function parseExMeta(meta: string): ParsedMeta {
  const m = meta.trim();

  // "N × M sec/s" → N timed sets of M seconds
  const tSec = m.match(/^(\d+)\s*[×x]\s*(\d+)\s*(sec|s)\b/i);
  if (tSec) {
    const setCount = parseInt(tSec[1]), sec = parseInt(tSec[2]);
    return { setCount, repsStr: `${sec}s`, isTimed: true, timedSec: sec, estimatedSetMs: sec * 1000 };
  }

  // "N × M min" → N timed sets of M minutes
  const tMin = m.match(/^(\d+)\s*[×x]\s*(\d+)\s*(min)\b/i);
  if (tMin) {
    const setCount = parseInt(tMin[1]), min = parseInt(tMin[2]);
    return { setCount, repsStr: `${min}min`, isTimed: true, timedSec: min * 60, estimatedSetMs: min * 60 * 1000 };
  }

  // "N × reps" standard sets e.g. "4 × 15–20", "3 × 12"
  const std = m.match(/^(\d+)\s*[×x]\s*([\d]+(?:[–\-][\d]+)?(?:\/\w+)?)/);
  if (std) {
    const setCount = parseInt(std[1]);
    const repsStr = std[2];
    const rRange = repsStr.match(/(\d+)[–\-](\d+)/);
    const avgReps = rRange ? (parseInt(rRange[1]) + parseInt(rRange[2])) / 2 : (parseInt(repsStr) || 12);
    return { setCount, repsStr, isTimed: false, timedSec: null, estimatedSetMs: Math.round(avgReps * 2500) };
  }

  // "10 × 20 sec" sprint intervals — catch before standalone
  const sprintInterval = m.match(/^(\d+)\s*[×x]\s*(\d+)\s*sec\b/i);
  if (sprintInterval) {
    const setCount = parseInt(sprintInterval[1]), sec = parseInt(sprintInterval[2]);
    return { setCount, repsStr: `${sec}s`, isTimed: true, timedSec: sec, estimatedSetMs: sec * 1000 };
  }

  // "M sec" standalone
  const sSec = m.match(/^(\d+)\s*(sec|s)\b/i);
  if (sSec) {
    const sec = parseInt(sSec[1]);
    return { setCount: 1, repsStr: `${sec}s`, isTimed: true, timedSec: sec, estimatedSetMs: sec * 1000 };
  }

  // "M–N min" range e.g. "10–15 min"
  const rMin = m.match(/(\d+)[–\-](\d+)\s*min/i);
  if (rMin) {
    const avg = (parseInt(rMin[1]) + parseInt(rMin[2])) / 2;
    return { setCount: 1, repsStr: m, isTimed: true, timedSec: Math.round(avg * 60), estimatedSetMs: Math.round(avg * 60 * 1000) };
  }

  // "M min" single minute duration
  const sMin = m.match(/^(\d+)\s*min\b/i);
  if (sMin) {
    const min = parseInt(sMin[1]);
    return { setCount: 1, repsStr: `${min}min`, isTimed: true, timedSec: min * 60, estimatedSetMs: min * 60 * 1000 };
  }

  // "N reps" (single set, rep-based) e.g. "15 reps", "20 reps"
  const sReps = m.match(/^(\d+)\s*reps?\b/i);
  if (sReps) {
    const reps = parseInt(sReps[1]);
    return { setCount: 1, repsStr: `${reps} reps`, isTimed: false, timedSec: null, estimatedSetMs: Math.round(reps * 2500) };
  }

  // "N × ...complex label..."
  const cx = m.match(/^(\d+)\s*[×x]/);
  if (cx) {
    return { setCount: parseInt(cx[1]), repsStr: m.replace(/^\d+\s*[×x]\s*/, ''), isTimed: false, timedSec: null, estimatedSetMs: 45_000 };
  }

  return { setCount: 1, repsStr: m, isTimed: false, timedSec: null, estimatedSetMs: 45_000 };
}

// ── Parse rounds from block label (for circuit blocks) ──────────────────────────

export function parseBlockRounds(label: string): number {
  const rng = label.match(/(\d+)[–\-](\d+)\s*round/i);
  if (rng) return parseInt(rng[1]); // lower bound of range
  const single = label.match(/^(\d+)\s*round/i);
  if (single) return parseInt(single[1]);
  return 0; // 0 = no multiplier
}

// ── Rest duration from block label ──────────────────────────────────────────────

export function getRestMs(blockLabel: string): number {
  const lower = blockLabel.toLowerCase();
  if (lower.includes('30s rest') || lower.includes('30s work') || lower.includes('circuit')) return 30_000;
  if (lower.includes('core') || lower.includes('45 sec') || lower.includes('finisher')) return 45_000;
  if (lower.includes('60–90') || lower.includes('60-90') || lower.includes('main lift') || lower.includes('strength')) return 75_000;
  if (lower.includes('75–90') || lower.includes('75-90') || lower.includes('lower body')) return 80_000;
  if (lower.includes('boxing') || lower.includes('3–4 round') || lower.includes('gymnastics')) return 45_000;
  return 60_000;
}

// ── Format ms → "M:SS" ──────────────────────────────────────────────────────────

export function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── localStorage key ────────────────────────────────────────────────────────────

export function sessionKey(dayIndex: number): string {
  const date = new Date().toISOString().slice(0, 10);
  return `lp_workout_${date}_d${dayIndex}`;
}

// ── Init a fresh session from a WorkoutDay ──────────────────────────────────────

export function initSession(
  day: {
    warmup?: { label: string; ex: [string, string][] };
    blocks?: { label: string; ex: [string, string][] }[];
    cooldown?: { label: string; ex: [string, string][] };
  },
  dayIndex: number
): WorkoutSession {
  const exercises: Record<string, ExerciseRecord> = {};

  const addBlock = (block: { label: string; ex: [string, string][] }, prefix: string) => {
    const restMs = getRestMs(block.label);
    const blockRounds = parseBlockRounds(block.label);
    block.ex.forEach(([, meta], ei) => {
      const p = parseExMeta(meta);
      const effectiveCount = blockRounds > 1 && p.setCount === 1 ? blockRounds : p.setCount;
      const key = `${prefix}-${ei}`;
      exercises[key] = {
        key,
        sets: Array.from({ length: effectiveCount }, () => ({
          status: 'idle', startedAt: null, completedAt: null, durationMs: null,
        })),
        restTargetMs: restMs,
        restStartedAt: null,
        restExtensions: 0,
        restActualMs: null,
        isTimed: p.isTimed,
        timedSec: p.timedSec,
        setCount: effectiveCount,
      };
    });
  };

  if (day.warmup) addBlock(day.warmup, 'warmup');
  (day.blocks ?? []).forEach((block, bi) => addBlock(block, `${bi}`));
  if (day.cooldown) addBlock(day.cooldown, 'cooldown');

  return { dayIndex, startedAt: Date.now(), endedAt: null, exercises, pausedAt: null, totalPausedMs: 0 };
}

// ── Load / Save ─────────────────────────────────────────────────────────────────

export function loadSession(dayIndex: number): WorkoutSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(dayIndex));
    return raw ? (JSON.parse(raw) as WorkoutSession) : null;
  } catch { return null; }
}

export function saveSession(session: WorkoutSession): void {
  try {
    localStorage.setItem(sessionKey(session.dayIndex), JSON.stringify(session));
  } catch {}
}

// ── Compute live session stats ──────────────────────────────────────────────────

export function computeStats(session: WorkoutSession): SessionStats {
  const now = Date.now();
  const base = session.endedAt ?? now;
  const totalPaused = session.pausedAt
    ? session.totalPausedMs + (now - session.pausedAt)
    : session.totalPausedMs;
  const elapsedMs = Math.max(0, base - session.startedAt - session.totalPausedMs);

  let setsTotal = 0, setsDone = 0, setsActive = 0;
  let totalSetMs = 0, doneCount = 0;
  let totalRestMs = 0, prescribedRestMs = 0, restExtensions = 0;

  Object.values(session.exercises).forEach(ex => {
    ex.sets.forEach(s => {
      setsTotal++;
      if (s.status === 'done') { setsDone++; if (s.durationMs) { totalSetMs += s.durationMs; doneCount++; } }
      if (s.status === 'active') setsActive++;
    });
    if (ex.restActualMs !== null) totalRestMs += ex.restActualMs;
    else if (ex.restStartedAt) totalRestMs += now - ex.restStartedAt;
    prescribedRestMs += ex.restTargetMs * Math.max(1, setsDone);
    restExtensions += ex.restExtensions;
  });

  const avgSetMs = doneCount > 0 ? totalSetMs / doneCount : 40_000;
  const remainingSets = Math.max(0, setsTotal - setsDone - setsActive);
  const etaMs = remainingSets * (avgSetMs + getRestMs(''));

  const expectedSoFar = setsDone * (avgSetMs + 60_000);
  const efficiencyPct = elapsedMs > 0 ? Math.min(120, Math.round((expectedSoFar / elapsedMs) * 100)) : 100;

  return { elapsedMs, setsTotal, setsDone, setsActive, avgSetMs, totalRestMs, prescribedRestMs, restExtensions, etaMs, efficiencyPct };
}

// ── Session grade ───────────────────────────────────────────────────────────────

export function getSessionGrade(stats: SessionStats): { grade: string; color: string; desc: string } {
  const comp = stats.setsTotal > 0 ? stats.setsDone / stats.setsTotal : 0;
  if (comp >= 1.0 && stats.efficiencyPct >= 85 && stats.restExtensions < 3)
    return { grade: 'S', color: 'var(--turmeric)', desc: 'Perfect — Absolute Beast' };
  if (comp >= 0.9 && stats.efficiencyPct >= 72)
    return { grade: 'A', color: '#4ade80', desc: 'Excellent Session' };
  if (comp >= 0.75 && stats.efficiencyPct >= 58)
    return { grade: 'B', color: '#60a5fa', desc: 'Solid Effort' };
  if (comp >= 0.5)
    return { grade: 'C', color: '#9ca3af', desc: 'Good Start' };
  return { grade: 'D', color: 'var(--paprika)', desc: 'Keep Pushing' };
}
