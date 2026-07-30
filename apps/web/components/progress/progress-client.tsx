"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";

// Default fallback if no data exists
const SAMPLE_DATA = [
  { date: "2026-07-01", weight: 74.5, bodyFat: 18.2 },
  { date: "2026-07-05", weight: 74.0, bodyFat: 17.9 },
  { date: "2026-07-10", weight: 73.5, bodyFat: 17.5 },
  { date: "2026-07-15", weight: 73.1, bodyFat: 17.2 },
];

function loadEntries() {
  try {
    const saved = localStorage.getItem("lp_entries");
    return saved ? JSON.parse(saved) : SAMPLE_DATA;
  } catch {
    return SAMPLE_DATA;
  }
}

function saveEntries(entries: any[]) {
  try {
    localStorage.setItem("lp_entries", JSON.stringify(entries));
    window.dispatchEvent(new Event("lp_entries_updated"));
  } catch {}
}

const EntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  weight: z.coerce.number().positive("Enter a valid weight"),
  bodyFat: z.coerce.number().min(0).max(100).optional(),
});
type EntryForm = z.infer<typeof EntrySchema>;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card text-xs p-3 shadow-xl">
      <p className="font-mono text-[--muted] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export function ProgressClient() {
  const [entries, setEntries] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Load entries on mount
  useEffect(() => {
    setEntries(loadEntries());
  }, []);

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
    setEntries((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      saveEntries(next);
      return next;
    });
  };

  const latest = entries[entries.length - 1];
  const prev = entries[entries.length - 2];
  const wtDelta = latest && prev ? (latest.weight - prev.weight).toFixed(1) : null;
  const bfDelta = latest && prev ? (latest.bodyFat - prev.bodyFat).toFixed(1) : null;

  return (
    <div className="space-y-6">
      {/* Hero Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Weight", value: latest?.weight ?? "—", unit: "kg", delta: wtDelta, good: wtDelta !== null && parseFloat(wtDelta) <= 0 },
          { label: "Body Fat", value: latest?.bodyFat ?? "—", unit: "%", delta: bfDelta, good: bfDelta !== null && parseFloat(bfDelta) <= 0 },
        ].map((m) => (
          <motion.div key={m.label} className="card" whileHover={{ scale: 1.01 }}>
            <p className="font-mono text-[0.6rem] uppercase tracking-widest text-[--muted]">{m.label}</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="font-display text-5xl text-[--text]">{m.value}</span>
              <span className="font-mono text-sm text-[--muted] mb-1">{m.unit}</span>
            </div>
            {m.delta && (
              <span className={cn("font-mono text-xs mt-1 inline-block", m.good ? "text-[--sage]" : "text-[--paprika]")}>
                {parseFloat(m.delta) > 0 ? "+" : ""}{m.delta} {m.unit} since last
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-[--text]">Trend</h2>
          <div className="flex gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block bg-[--turmeric]" />Weight</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full inline-block bg-[--sage]" />Body Fat %</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={entries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="rgba(232,229,217,0.06)" strokeDasharray="4 4" />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              tickFormatter={(d) => d.slice(5)}
              axisLine={false} tickLine={false}
            />
            <YAxis
              yAxisId="w" domain={["auto", "auto"]}
              tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              yAxisId="bf" orientation="right" domain={["auto", "auto"]}
              tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line yAxisId="w" type="monotone" dataKey="weight" stroke="var(--turmeric)" strokeWidth={2.5} dot={false} name="Weight (kg)" />
            <Line yAxisId="bf" type="monotone" dataKey="bodyFat" stroke="var(--sage)" strokeWidth={2.5} dot={false} name="Body Fat %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Add Entry */}
      <div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[--turmeric] text-[--ink] font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Log New Entry
        </button>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit(onSubmit)}
            className="card mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              { name: "date" as const, label: "Date", type: "date", placeholder: "" },
              { name: "weight" as const, label: "Weight (kg)", type: "number", placeholder: "72.0" },
              { name: "bodyFat" as const, label: "Body Fat %", type: "number", placeholder: "16.5" },
            ].map((f) => (
              <div key={f.name}>
                <label className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted] block mb-1">{f.label}</label>
                <input
                  {...register(f.name)}
                  type={f.type}
                  placeholder={f.placeholder}
                  step="0.1"
                  className="w-full bg-[--panel-2] border border-[--line] rounded-xl px-3 py-2.5 text-sm text-[--text] font-mono focus:outline-none focus:border-[--turmeric] transition-colors"
                />
                {errors[f.name] && (
                  <p className="text-[--paprika] font-mono text-[0.65rem] mt-1">{errors[f.name]?.message}</p>
                )}
              </div>
            ))}
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-full bg-[--turmeric] text-[--ink] font-mono text-xs font-bold uppercase">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-full border border-[--line] text-[--muted] font-mono text-xs uppercase">Cancel</button>
            </div>
          </motion.form>
        )}
      </div>

      {/* Log Table */}
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
                  <button onClick={() => deleteEntry(entries.length - 1 - i)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[--muted] hover:text-[--paprika]">
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
