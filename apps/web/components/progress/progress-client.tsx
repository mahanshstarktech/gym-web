"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, Cell,
} from "recharts";
import { Plus, Trash2, Dumbbell, Salad, TrendingUp, Award, Flame, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import {
  loadAllWorkoutSessions, loadAllFoodLogs,
  computeWorkoutAggregate, computeNutritionAggregate,
  formatMs,
  type WorkoutHistoryEntry,
} from "@/lib/stats-engine";
import { AiCoach } from "./ai-coach";

// ── Existing body entry schema ─────────────────────────────────────────────────

const SAMPLE_DATA = [
  { date: "2026-07-01", weight: 74.5, bodyFat: 18.2 },
  { date: "2026-07-05", weight: 74.0, bodyFat: 17.9 },
  { date: "2026-07-10", weight: 73.5, bodyFat: 17.5 },
  { date: "2026-07-15", weight: 73.1, bodyFat: 17.2 },
];

function loadEntries() {
  try { const s = localStorage.getItem("lp_entries"); return s ? JSON.parse(s) : SAMPLE_DATA; }
  catch { return SAMPLE_DATA; }
}
function saveEntries(e: any[]) {
  try { localStorage.setItem("lp_entries", JSON.stringify(e)); window.dispatchEvent(new Event("lp_entries_updated")); } catch {}
}

const EntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  weight: z.coerce.number().positive("Enter a valid weight"),
  bodyFat: z.coerce.number().min(0).max(100).optional(),
});
type EntryForm = z.infer<typeof EntrySchema>;

// ── Custom tooltip ─────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card text-xs p-3 shadow-xl">
      <p className="font-mono text-[--muted] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main exported component
// ═══════════════════════════════════════════════════════════════════════════════

export function ProgressClient() {
  const [tab, setTab] = useState<"body" | "workout" | "nutrition">("body");
  
  // Compute global stats for AI coach once
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [foodLogs, setFoodLogs] = useState<any[]>([]);
  useEffect(() => {
    setHistory(loadAllWorkoutSessions());
    setFoodLogs(loadAllFoodLogs());
  }, []);
  const workoutStats = useMemo(() => computeWorkoutAggregate(history), [history]);
  const nutritionStats = useMemo(() => computeNutritionAggregate(foodLogs), [foodLogs]);

  return (
    <div className="space-y-6">
      <AiCoach workoutStats={workoutStats} nutritionStats={nutritionStats} />

      {/* Tab switcher */}
      <div className="flex gap-2">
        {([
          { key: "body", icon: TrendingUp, label: "Body" },
          { key: "workout", icon: Dumbbell, label: "Workout" },
          { key: "nutrition", icon: Salad, label: "Nutrition" },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-all",
              tab === key
                ? "bg-[--turmeric] text-[--ink] font-bold"
                : "border border-[--line] text-[--muted] hover:border-[--line-strong] hover:text-[--text]"
            )}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "body" && (
          <motion.div key="body" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            <BodyTab />
          </motion.div>
        )}
        {tab === "workout" && (
          <motion.div key="workout" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            <WorkoutTab />
          </motion.div>
        )}
        {tab === "nutrition" && (
          <motion.div key="nutrition" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            <NutritionTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Body Tab — weight + body fat charts (existing, enhanced)
// ═══════════════════════════════════════════════════════════════════════════════

function BodyTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { setEntries(loadEntries()); }, []);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EntryForm>({
    resolver: zodResolver(EntrySchema),
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = (data: EntryForm) => {
    setEntries((prev) => {
      const next = [...prev, { date: data.date, weight: data.weight, bodyFat: data.bodyFat ?? 0 }]
        .sort((a, b) => a.date.localeCompare(b.date));
      saveEntries(next);
      return next;
    });
    reset();
    setShowForm(false);
  };

  const deleteEntry = (idx: number) => {
    setEntries((prev) => { const next = prev.filter((_, i) => i !== idx); saveEntries(next); return next; });
  };

  const latest = entries[entries.length - 1];
  const prev = entries[entries.length - 2];
  const wtDelta = latest && prev ? (latest.weight - prev.weight).toFixed(1) : null;
  const bfDelta = latest && prev ? (latest.bodyFat - prev.bodyFat).toFixed(1) : null;

  // BMI & LBM
  const bmi = latest?.weight ? (latest.weight / ((1.72 ** 2))).toFixed(1) : null; // assume ~172cm
  const lbm = latest?.weight && latest?.bodyFat ? (latest.weight * (1 - latest.bodyFat / 100)).toFixed(1) : null;
  const fatMass = latest?.weight && latest?.bodyFat ? (latest.weight * (latest.bodyFat / 100)).toFixed(1) : null;

  // 4-week change
  const fourWeeksAgo = entries.find((e) => {
    const d = new Date(e.date).getTime();
    return Date.now() - d <= 28 * 86400000;
  });
  const monthChange = latest && entries.length > 0
    ? (latest.weight - entries[0].weight).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Hero metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Weight", value: latest?.weight ?? "—", unit: "kg", delta: wtDelta, good: wtDelta !== null && parseFloat(wtDelta) <= 0 },
          { label: "Body Fat", value: latest?.bodyFat ?? "—", unit: "%", delta: bfDelta, good: bfDelta !== null && parseFloat(bfDelta) <= 0 },
          { label: "Est. BMI", value: bmi ?? "—", unit: "", delta: null, good: true },
          { label: "Lean Mass", value: lbm ?? "—", unit: "kg", delta: null, good: true },
        ].map((m) => (
          <motion.div key={m.label} className="card" whileHover={{ scale: 1.01 }}>
            <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[--muted]">{m.label}</p>
            <div className="flex items-end gap-1 mt-1">
              <span className="font-display text-4xl text-[--text]">{m.value}</span>
              {m.unit && <span className="font-mono text-sm text-[--muted] mb-1">{m.unit}</span>}
            </div>
            {m.delta && (
              <span className={cn("font-mono text-xs mt-1 inline-block", m.good ? "text-[--sage]" : "text-[--paprika]")}>
                {parseFloat(m.delta) > 0 ? "+" : ""}{m.delta} kg since last
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Extra body comp */}
      {latest?.bodyFat > 0 && (
        <div className="card">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-3">Body Composition</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Fat Mass", value: fatMass ?? "—", unit: "kg", color: "var(--paprika)" },
              { label: "Lean Mass", value: lbm ?? "—", unit: "kg", color: "var(--sage)" },
              { label: "Total Change", value: monthChange ? (parseFloat(monthChange) > 0 ? `+${monthChange}` : monthChange) : "—", unit: "kg", color: monthChange && parseFloat(monthChange) < 0 ? "var(--sage)" : "var(--paprika)" },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="bg-[--panel-2] rounded-xl p-3 text-center">
                <p className="font-mono text-[0.55rem] uppercase tracking-wider text-[--muted] mb-1">{label}</p>
                <p className="font-display text-2xl" style={{ color }}>{value}</p>
                <p className="font-mono text-[0.55rem] text-[--muted]">{unit}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-[--text]">Trend</h2>
          <div className="flex gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block bg-[--turmeric]" />Weight</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block bg-[--sage]" />Body Fat %</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={entries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="rgba(232,229,217,0.06)" strokeDasharray="4 4" />
            <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
            <YAxis yAxisId="w" domain={["auto", "auto"]} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="bf" orientation="right" domain={["auto", "auto"]} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line yAxisId="w" type="monotone" dataKey="weight" stroke="var(--turmeric)" strokeWidth={2.5} dot={false} name="Weight (kg)" />
            <Line yAxisId="bf" type="monotone" dataKey="bodyFat" stroke="var(--sage)" strokeWidth={2.5} dot={false} name="Body Fat %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Log entry */}
      <div>
        <button onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[--turmeric] text-[--ink] font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
          <Plus size={16} /> Log New Entry
        </button>
        {showForm && (
          <motion.form initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit(onSubmit)}
            className="card mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: "date" as const, label: "Date", type: "date" },
              { name: "weight" as const, label: "Weight (kg)", type: "number" },
              { name: "bodyFat" as const, label: "Body Fat %", type: "number" },
            ].map((f) => (
              <div key={f.name}>
                <label className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted] block mb-1">{f.label}</label>
                <input {...register(f.name)} type={f.type} step="0.1"
                  className="w-full bg-[--panel-2] border border-[--line] rounded-xl px-3 py-2.5 text-sm text-[--text] font-mono focus:outline-none focus:border-[--turmeric] transition-colors" />
                {errors[f.name] && <p className="text-[--paprika] font-mono text-[0.65rem] mt-1">{errors[f.name]?.message}</p>}
              </div>
            ))}
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-full bg-[--turmeric] text-[--ink] font-mono text-xs font-bold uppercase">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-full border border-[--line] text-[--muted] font-mono text-xs uppercase">Cancel</button>
            </div>
          </motion.form>
        )}
      </div>

      {/* Log table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[--line]">
              {["Date", "Weight (kg)", "Body Fat %", ""].map((h) => (
                <th key={h} className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted] text-left py-2 px-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...entries].reverse().map((e, i) => (
              <tr key={i} className="border-b border-[--line] last:border-0 hover:bg-[--panel-2] transition-colors group">
                <td className="py-2.5 px-2 font-mono text-xs text-[--muted]">{e.date}</td>
                <td className="py-2.5 px-2 font-display text-lg text-[--turmeric]">{e.weight}</td>
                <td className="py-2.5 px-2 font-display text-lg text-[--sage]">{e.bodyFat ?? "—"}</td>
                <td className="py-2.5 px-2 text-right">
                  <button onClick={() => deleteEntry(entries.length - 1 - i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[--muted] hover:text-[--paprika]">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Workout Tab
// ═══════════════════════════════════════════════════════════════════════════════

function WorkoutTab() {
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [selectedSession, setSelectedSession] = useState<WorkoutHistoryEntry | null>(null);

  useEffect(() => {
    setHistory(loadAllWorkoutSessions());
  }, []);

  const agg = useMemo(() => computeWorkoutAggregate(history), [history]);

  if (history.length === 0) {
    return (
      <div className="card text-center py-12">
        <Dumbbell size={40} className="mx-auto text-[--turmeric] mb-3 opacity-50" />
        <p className="font-display text-2xl text-[--muted]">No workouts logged yet</p>
        <p className="font-mono text-sm text-[--muted] mt-2">Complete a session from the Train tab to see analytics here.</p>
      </div>
    );
  }

  if (selectedSession) {
    return <SessionDetailView entry={selectedSession} onBack={() => setSelectedSession(null)} />;
  }

  const muscleData = Object.entries(agg.muscleGroupCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Hero metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sessions", val: agg.totalSessions, color: "var(--turmeric)", icon: Dumbbell },
          { label: "Sets Logged", val: agg.totalSetsLogged, color: "var(--sage)", icon: Flame },
          { label: "Streak", val: `${agg.currentStreak}d`, color: agg.currentStreak >= 3 ? "var(--turmeric)" : "var(--muted)", icon: Flame },
          { label: "Avg Efficiency", val: `${agg.avgEfficiency}%`, color: agg.avgEfficiency >= 80 ? "var(--sage)" : "var(--paprika)", icon: TrendingUp },
        ].map(({ label, val, color, icon: Icon }) => (
          <div key={label} className="card text-center">
            <Icon size={16} className="mx-auto mb-1 opacity-50" style={{ color }} />
            <p className="font-display text-3xl" style={{ color }}>{val}</p>
            <p className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Extended stats */}
      <div className="card">
        <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-3">Advanced Metrics</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Avg Duration", val: formatMs(agg.avgDurationMs), color: "var(--turmeric)" },
            { label: "Total Active Time", val: formatMs(agg.totalActiveTimeMs), color: "var(--sage)" },
            { label: "Avg Sets/Session", val: agg.avgSetsPerSession, color: "var(--text)" },
            { label: "Avg Rest Ext.", val: `${agg.avgRestExtensions}×`, color: agg.avgRestExtensions > 2 ? "var(--paprika)" : "var(--muted)" },
            { label: "Longest Streak", val: `${agg.longestStreak}d`, color: "var(--turmeric)" },
            { label: "Best Session", val: agg.bestSession ? agg.bestSession.grade : "—", color: agg.bestSession ? agg.bestSession.gradeColor : "var(--muted)" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-[--panel-2] rounded-xl p-3">
              <p className="font-mono text-[0.55rem] uppercase tracking-wider text-[--muted] mb-1">{label}</p>
              <p className="font-display text-2xl" style={{ color }}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Muscle group balance */}
      {muscleData.length > 0 && (
        <div className="card">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-3">Muscle Group Frequency</p>
          <div className="flex gap-2 flex-wrap">
            {muscleData.map(({ name, value }) => {
              const total = muscleData.reduce((a, d) => a + d.value, 0);
              const pct = Math.round((value / total) * 100);
              const colors: Record<string, string> = { Push: "var(--turmeric)", Pull: "var(--sage)", Legs: "rgb(96,165,250)", Cardio: "var(--paprika)", "Full Body": "#a78bfa" };
              return (
                <div key={name} className="flex-1 min-w-[80px]">
                  <div className="bg-[--panel-2] rounded-xl p-3 text-center">
                    <p className="font-display text-2xl" style={{ color: colors[name] ?? "var(--muted)" }}>{value}</p>
                    <p className="font-mono text-[0.6rem] text-[--muted]">{name}</p>
                    <p className="font-mono text-[0.55rem] text-[--muted]">{pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Balance warning */}
          {muscleData.length >= 2 && (() => {
            const push = agg.muscleGroupCounts["Push"] ?? 0;
            const pull = agg.muscleGroupCounts["Pull"] ?? 0;
            if (push > 0 && pull > 0 && Math.abs(push - pull) >= 2) {
              return (
                <p className="font-mono text-[0.6rem] text-[--paprika] mt-3">
                  ⚠️ Push/Pull imbalance: {push} push vs {pull} pull sessions. Balance for shoulder health.
                </p>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Grade distribution */}
      {Object.keys(agg.gradeDistribution).length > 0 && (
        <div className="card">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-3">Session Grade Distribution</p>
          <div className="flex gap-3">
            {["S", "A", "B", "C", "D"].map((g) => {
              const count = agg.gradeDistribution[g] ?? 0;
              const colors: Record<string, string> = { S: "var(--turmeric)", A: "#4ade80", B: "#60a5fa", C: "#9ca3af", D: "var(--paprika)" };
              return (
                <div key={g} className="flex-1 text-center">
                  <p className="font-display text-3xl" style={{ color: colors[g] }}>{count || "—"}</p>
                  <p className="font-mono text-[0.65rem] text-[--muted]">{g}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly volume chart */}
      {agg.weeklyVolume.length > 0 && (
        <div className="card">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-3">Weekly Sets (Last 8 Weeks)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={agg.weeklyVolume} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(232,229,217,0.06)" strokeDasharray="4 4" />
              <XAxis dataKey="week" tickFormatter={(d) => d.slice(5)} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="sets" name="Sets" radius={[4, 4, 0, 0]}>
                {agg.weeklyVolume.map((_, i) => (
                  <Cell key={i} fill={i === agg.weeklyVolume.length - 1 ? "var(--turmeric)" : "rgba(224,168,58,0.35)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Fatigue trend */}
      {agg.fatigueBySession.length > 1 && (
        <div className="card">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-1">Avg Set Duration Trend</p>
          <p className="font-mono text-[0.6rem] text-[--muted] mb-3">Rising = longer sets = fatigue accumulating</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={agg.fatigueBySession} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(232,229,217,0.06)" strokeDasharray="4 4" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}s`} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => `${(v / 1000).toFixed(1)}s`} content={<ChartTooltip />} />
              <Line type="monotone" dataKey="avgSetMs" name="Avg Set" stroke="var(--turmeric)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Past session history */}
      <div className="card">
        <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-3">Session History</p>
        <div className="space-y-2">
          {history.map((entry) => (
            <motion.button key={entry.key} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedSession(entry)}
              className="w-full card py-3 px-4 text-left hover:border-[--turmeric] transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl flex-none" style={{ color: entry.gradeColor }}>{entry.grade}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[--text]">{entry.dayName} — {entry.focus}</p>
                  <p className="font-mono text-[0.6rem] text-[--muted]">
                    {entry.date} · {formatMs(entry.stats.elapsedMs)} · {entry.stats.setsDone}/{entry.stats.setsTotal} sets
                  </p>
                </div>
                <div className="flex-none text-right">
                  <p className="font-mono text-[0.65rem] text-[--turmeric]">{entry.stats.efficiencyPct}% eff</p>
                  <p className="font-mono text-[0.6rem] text-[--muted]">Tap to view →</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Past session detail view ───────────────────────────────────────────────────

function SessionDetailView({ entry, onBack }: { entry: WorkoutHistoryEntry; onBack: () => void }) {
  const { session, stats, dayName, focus } = entry;
  const totalMs = (session.endedAt ?? Date.now()) - session.startedAt - session.totalPausedMs;

  // Build fatigue curve
  const fatigueCurve: { ms: number; label: string }[] = [];
  Object.entries(session.exercises).forEach(([, ex]) => {
    ex.sets.forEach((s, si) => {
      if (s.durationMs) fatigueCurve.push({ ms: s.durationMs, label: `S${si + 1}` });
    });
  });
  const maxMs = Math.max(...fatigueCurve.map((f) => f.ms), 1);

  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[--muted] hover:text-[--text] font-mono text-xs transition-colors mb-2">
        ← Back to history
      </button>

      {/* Session header */}
      <div className="card bg-[rgba(224,168,58,0.04)] border-[--turmeric]">
        <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[--turmeric] mb-1">{entry.date}</p>
        <p className="font-display text-2xl text-[--text]">{dayName} — {focus}</p>
        <div className="flex gap-2 mt-2 flex-wrap">
          <span className="badge badge-gold">{formatMs(totalMs)}</span>
          <span className="badge badge-gold">{stats.setsDone}/{stats.setsTotal} sets</span>
          <span className="badge badge-gold">{stats.efficiencyPct}% efficiency</span>
        </div>
      </div>

      {/* Grade + stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Grade", val: entry.grade, color: entry.gradeColor },
          { label: "Duration", val: formatMs(totalMs), color: "var(--turmeric)" },
          { label: "Rest Taken", val: formatMs(stats.totalRestMs), color: "rgb(96,165,250)" },
          { label: "Rest Ext.", val: `${stats.restExtensions}×`, color: stats.restExtensions > 3 ? "var(--paprika)" : "var(--muted)" },
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
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-3">Fatigue Curve</p>
          <div className="flex items-end gap-0.5 h-20">
            {fatigueCurve.map(({ ms, label }, i) => {
              const h = ms / maxMs;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative h-full">
                  <div className="absolute bottom-full mb-1 hidden group-hover:flex bg-[--panel] border border-[--line] rounded px-2 py-1 font-mono text-[0.55rem] text-[--text] whitespace-nowrap z-10">
                    {label}: {formatMs(ms)}
                  </div>
                  <div className="w-full mt-auto rounded-t-sm"
                    style={{ height: `${h * 100}%`, background: i < fatigueCurve.length / 2 ? "var(--turmeric)" : "var(--sage)" }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exercise breakdown */}
      <div className="card">
        <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-3">Exercise Breakdown</p>
        <div className="space-y-0">
          {Object.entries(session.exercises).map(([key, ex]) => {
            const done = ex.sets.filter((s) => s.status === "done");
            const avgMs = done.length > 0 ? done.reduce((a, s) => a + (s.durationMs ?? 0), 0) / done.length : 0;
            return (
              <div key={key} className="flex items-center gap-3 py-3 border-b border-[--line] last:border-0">
                <div className="flex-1">
                  <p className="font-mono text-xs text-[--muted]">Exercise {key}</p>
                </div>
                <div className="flex gap-3 flex-none">
                  <div className="text-right">
                    <p className="font-display text-lg text-[--turmeric]">{done.length}/{ex.sets.length}</p>
                    <p className="font-mono text-[0.5rem] text-[--muted]">sets</p>
                  </div>
                  {avgMs > 0 && (
                    <div className="text-right">
                      <p className="font-display text-lg text-[--text]">{formatMs(avgMs)}</p>
                      <p className="font-mono text-[0.5rem] text-[--muted]">avg/set</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Nutrition Tab
// ═══════════════════════════════════════════════════════════════════════════════

function NutritionTab() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    setLogs(loadAllFoodLogs());
  }, []);

  const agg = useMemo(() => computeNutritionAggregate(logs), [logs]);

  if (logs.length === 0) {
    return (
      <div className="card text-center py-12">
        <Salad size={40} className="mx-auto text-[--turmeric] mb-3 opacity-50" />
        <p className="font-display text-2xl text-[--muted]">No meals logged yet</p>
        <p className="font-mono text-sm text-[--muted] mt-2">Log meals from the Eat tab to see nutrition analytics here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Days Logged", val: agg.totalDaysLogged, color: "var(--turmeric)" },
          { label: "Calorie Adherence", val: `${agg.kcalAdherenceRate}%`, color: agg.kcalAdherenceRate >= 70 ? "var(--sage)" : "var(--paprika)" },
          { label: "Protein Hit Rate", val: `${agg.proteinHitRate}%`, color: agg.proteinHitRate >= 70 ? "var(--sage)" : "var(--paprika)" },
          { label: "Meal Completion", val: `${agg.mealCompletionRate}%`, color: agg.mealCompletionRate >= 80 ? "var(--sage)" : "var(--muted)" },
        ].map(({ label, val, color }) => (
          <div key={label} className="card text-center">
            <p className="font-display text-3xl" style={{ color }}>{val}</p>
            <p className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Extended stats */}
      <div className="card">
        <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-3">Eating Patterns</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Avg Daily Calories", val: `${agg.avgDailyKcal} kcal`, color: "var(--turmeric)" },
            { label: "Avg Daily Protein", val: `${agg.avgDailyProtein}g`, color: "var(--sage)" },
            { label: "Avg Eating Window", val: `${agg.avgEatingWindowHours}h`, color: "var(--text)" },
            { label: "Late Night Days", val: agg.lateNightEatingDays, color: agg.lateNightEatingDays >= 3 ? "var(--paprika)" : "var(--muted)" },
            { label: "Calorie Target", val: "2,180 kcal", color: "var(--muted)" },
            { label: "Protein Target", val: "140g", color: "var(--muted)" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-[--panel-2] rounded-xl p-3">
              <p className="font-mono text-[0.55rem] uppercase tracking-wider text-[--muted] mb-1">{label}</p>
              <p className="font-display text-xl" style={{ color }}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Calorie history chart */}
      {agg.calorieHistory.length > 1 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted]">Daily Calories & Protein</p>
            <div className="flex gap-2 text-xs font-mono">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[--turmeric] inline-block rounded" />kcal</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[--sage] inline-block rounded" />protein</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={agg.calorieHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(232,229,217,0.06)" strokeDasharray="4 4" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="k" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="p" orientation="right" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line yAxisId="k" type="monotone" dataKey="kcal" name="Calories" stroke="var(--turmeric)" strokeWidth={2} dot={false} />
              <Line yAxisId="p" type="monotone" dataKey="protein" name="Protein (g)" stroke="var(--sage)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Wins */}
      {agg.wins.length > 0 && (
        <div className="card border-[--sage] bg-[rgba(127,176,140,0.04)]">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--sage] mb-3">🏆 Wins</p>
          <div className="space-y-2">
            {agg.wins.map((w, i) => (
              <p key={i} className="font-mono text-xs text-[--text]">{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {agg.risks.length > 0 && (
        <div className="card border-[--paprika] bg-[rgba(201,96,63,0.04)]">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--paprika] mb-3">⚠️ Risks & Alerts</p>
          <div className="space-y-2">
            {agg.risks.map((r, i) => (
              <p key={i} className="font-mono text-xs text-[--text]">{r}</p>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {agg.suggestions.length > 0 && (
        <div className="card border-[rgba(224,168,58,0.3)] bg-[rgba(224,168,58,0.03)]">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--turmeric] mb-3">💡 Suggestions</p>
          <div className="space-y-2">
            {agg.suggestions.map((s, i) => (
              <p key={i} className="font-mono text-xs text-[--text]">{s}</p>
            ))}
          </div>
        </div>
      )}

      {/* Daily log history */}
      <div className="card overflow-x-auto">
        <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-3">Daily Log History</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[--line]">
              {["Date", "Calories", "Protein", "Meals"].map((h) => (
                <th key={h} className="font-mono text-[0.55rem] uppercase tracking-wider text-[--muted] text-left py-2 px-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.slice(0, 14).map((log, i) => {
              const onKcal = Math.abs(log.totalKcal - 2180) <= 250;
              const onProtein = log.totalProtein >= 130;
              return (
                <tr key={i} className="border-b border-[--line] last:border-0 hover:bg-[--panel-2] transition-colors">
                  <td className="py-2 px-2 font-mono text-xs text-[--muted]">{log.date}</td>
                  <td className="py-2 px-2 font-display text-base" style={{ color: onKcal ? "var(--sage)" : "var(--paprika)" }}>{Math.round(log.totalKcal)}</td>
                  <td className="py-2 px-2 font-display text-base" style={{ color: onProtein ? "var(--sage)" : "var(--paprika)" }}>{Math.round(log.totalProtein)}g</td>
                  <td className="py-2 px-2 font-mono text-xs text-[--muted]">{log.mealsLogged}/{log.totalMeals}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
