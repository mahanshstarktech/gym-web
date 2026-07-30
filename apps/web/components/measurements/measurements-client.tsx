"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const MEASUREMENT_FIELDS = [
  { name: "chest" as const, label: "Chest", unit: "cm" },
  { name: "waist" as const, label: "Waist", unit: "cm" },
  { name: "hips" as const, label: "Hips", unit: "cm" },
  { name: "leftArm" as const, label: "Left Arm", unit: "cm" },
  { name: "rightArm" as const, label: "Right Arm", unit: "cm" },
  { name: "leftThigh" as const, label: "Left Thigh", unit: "cm" },
  { name: "rightThigh" as const, label: "Right Thigh", unit: "cm" },
];

const Schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format"),
  chest: z.coerce.number().optional(),
  waist: z.coerce.number().optional(),
  hips: z.coerce.number().optional(),
  leftArm: z.coerce.number().optional(),
  rightArm: z.coerce.number().optional(),
  leftThigh: z.coerce.number().optional(),
  rightThigh: z.coerce.number().optional(),
});
type MeasurementForm = z.infer<typeof Schema>;

type Entry = MeasurementForm & { id: string };

export function MeasurementsClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MeasurementForm>({
    resolver: zodResolver(Schema),
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = (data: MeasurementForm) => {
    setEntries((prev) => [{ ...data, id: Date.now().toString() }, ...prev]);
    reset();
    setShowForm(false);
  };

  const latest = entries[0];
  const prev = entries[1];

  return (
    <div className="space-y-5">
      {/* Current snapshot */}
      {latest ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-[--text]">Latest — {latest.date}</h2>
            {prev && <span className="badge badge-muted">vs {prev.date}</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {MEASUREMENT_FIELDS.map((f) => {
              const val = latest[f.name];
              const prevVal = prev?.[f.name];
              const delta = val && prevVal ? (val - prevVal).toFixed(1) : null;
              if (!val) return null;
              return (
                <div key={f.name} className="bg-[--panel-2] rounded-xl p-3">
                  <p className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted]">{f.label}</p>
                  <p className="font-display text-2xl text-[--text] mt-0.5">{val}<span className="text-sm ml-1 text-[--muted]">cm</span></p>
                  {delta && (
                    <p className={`font-mono text-[0.65rem] mt-0.5 ${parseFloat(delta) < 0 ? "text-[--sage]" : "text-[--paprika]"}`}>
                      {parseFloat(delta) > 0 ? "+" : ""}{delta} cm
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card text-center py-10 text-[--muted]">
          <p className="font-display text-xl mb-2">No measurements yet</p>
          <p className="text-sm">Log your first measurement to start tracking body recomposition.</p>
        </div>
      )}

      {/* Add entry */}
      <button
        onClick={() => setShowForm((s) => !s)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[--turmeric] text-[--ink] font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
      >
        <Plus size={16} /> Log Measurements
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={handleSubmit(onSubmit)}
            className="card grid grid-cols-2 sm:grid-cols-3 gap-4"
          >
            <div className="col-span-full">
              <label className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted] block mb-1">Date</label>
              <input {...register("date")} type="date"
                className="w-full bg-[--panel-2] border border-[--line] rounded-xl px-3 py-2.5 text-sm text-[--text] font-mono focus:outline-none focus:border-[--turmeric] transition-colors" />
            </div>
            {MEASUREMENT_FIELDS.map((f) => (
              <div key={f.name}>
                <label className="font-mono text-[0.6rem] uppercase tracking-wider text-[--muted] block mb-1">{f.label} (cm)</label>
                <input {...register(f.name)} type="number" step="0.1" placeholder="—"
                  className="w-full bg-[--panel-2] border border-[--line] rounded-xl px-3 py-2.5 text-sm text-[--text] font-mono focus:outline-none focus:border-[--turmeric] transition-colors" />
              </div>
            ))}
            <div className="col-span-full flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-full bg-[--turmeric] text-[--ink] font-mono text-xs font-bold uppercase">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-full border border-[--line] text-[--muted] font-mono text-xs uppercase">Cancel</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* History */}
      {entries.length > 1 && (
        <div className="card overflow-x-auto">
          <h2 className="font-display text-lg text-[--text] mb-3">History</h2>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-[--line]">
                <th className="font-mono text-[0.6rem] uppercase tracking-wider text-left text-[--muted] py-2 px-2">Date</th>
                {MEASUREMENT_FIELDS.map((f) => (
                  <th key={f.name} className="font-mono text-[0.6rem] uppercase tracking-wider text-left text-[--muted] py-2 px-2">{f.label}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[--line] last:border-0 hover:bg-[--panel-2] group">
                  <td className="py-2.5 px-2 font-mono text-xs text-[--muted]">{e.date}</td>
                  {MEASUREMENT_FIELDS.map((f) => (
                    <td key={f.name} className="py-2.5 px-2 font-mono text-sm text-[--text]">{e[f.name] ?? "—"}</td>
                  ))}
                  <td className="py-2.5 px-2">
                    <button onClick={() => setEntries((prev) => prev.filter((x) => x.id !== e.id))}
                      className="opacity-0 group-hover:opacity-100 text-[--muted] hover:text-[--paprika] transition-all">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
