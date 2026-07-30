"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Circle, ChevronDown, ChevronUp, Timer } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WORKOUT_DAYS } from "@/lib/data";

type CheckMap = Record<string, boolean>;

export function WorkoutClient() {
  const [view, setView] = useState<"today" | "week">("today");
  const [checks, setChecks] = useState<CheckMap>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const today = new Date().getDay();
  const dayData = WORKOUT_DAYS[today];

  const toggleCheck = (key: string) => setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleBlock = (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const blockDone = (bi: number, count: number) =>
    Array.from({ length: count }).every((_, ei) => checks[`${today}-${bi}-${ei}`]);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {(["today", "week"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={cn("px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-all",
              view === v ? "bg-[--turmeric] text-[--ink] font-bold" : "border border-[--line] text-[--muted] hover:border-[--line-strong] hover:text-[--text]")}>
            {v === "today" ? "Today" : "This Week"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {view === "today" ? (
          <motion.div key="today" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            {dayData.rest ? (
              <div className="card text-center py-10">
                <p className="font-display text-4xl text-[--turmeric] mb-2">REST</p>
                <p className="text-[--muted] text-sm max-w-sm mx-auto">{dayData.note}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h2 className="font-display text-2xl text-[--text]">{dayData.name}</h2>
                    <p className="text-[--muted] text-sm">{dayData.focus} · {dayData.time}</p>
                  </div>
                  {dayData.focus.toLowerCase().includes("hiit") || dayData.focus.toLowerCase().includes("boxing") ? (
                    <Link href="/timer">
                      <button className="flex items-center gap-2 px-3 py-2 rounded-full bg-[rgba(224,168,58,0.1)] border border-[rgba(224,168,58,0.25)] text-[--turmeric] font-mono text-xs">
                        <Timer size={14} /> Open Timer
                      </button>
                    </Link>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {/* Warm-up block */}
                  {dayData.warmup && (
                    <WarmupBlock warmup={dayData.warmup} />
                  )}

                  {/* Main blocks */}
                  {dayData.blocks?.map((block, bi) => {
                    const done = blockDone(bi, block.ex.length);
                    const isCollapsed = collapsed[`block-${bi}`];
                    return (
                      <motion.div key={bi} layout className={cn("card transition-colors duration-300", done && "border-[--sage] bg-[rgba(127,176,140,0.04)]")}>
                        <button onClick={() => toggleBlock(`block-${bi}`)} className="w-full flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-5 h-5 rounded-full border-2 flex-none flex items-center justify-center transition-colors", done ? "border-[--sage] bg-[--sage]" : "border-[--line]")}>
                              {done && <svg viewBox="0 0 20 20" fill="none" className="w-full h-full"><path d="M5 10l4 4 6-7" stroke="#09181a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </div>
                            <span className={cn("font-medium text-sm", done ? "text-[--sage]" : "text-[--text]")}>{block.label}</span>
                          </div>
                          {isCollapsed ? <ChevronDown size={16} className="text-[--muted]" /> : <ChevronUp size={16} className="text-[--muted]" />}
                        </button>

                        <AnimatePresence initial={false}>
                          {!isCollapsed && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                              <div className="pt-3 space-y-1.5">
                                {block.ex.map(([name, meta], ei) => {
                                  const key = `${today}-${bi}-${ei}`;
                                  const checked = !!checks[key];
                                  return (
                                    <motion.button key={ei} whileTap={{ scale: 0.98 }} onClick={() => toggleCheck(key)}
                                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-[--panel-2] transition-colors text-left group">
                                      {checked
                                        ? <CheckCircle size={18} className="text-[--sage] flex-none mt-0.5" />
                                        : <Circle size={18} className="text-[--muted] group-hover:text-[--text] flex-none mt-0.5 transition-colors" />}
                                      <span className={cn("text-sm flex-1", checked ? "text-[--muted] line-through" : "text-[--text]")}>{name}</span>
                                      <span className="font-mono text-[0.65rem] text-[--turmeric] flex-none">{meta}</span>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}

                  {/* Cooldown block */}
                  {dayData.cooldown && (
                    <div className="card">
                      <p className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted] mb-2">Cooldown (15 min)</p>
                      <ul className="space-y-1">
                        {dayData.cooldown.map((c, i) => (
                          <li key={i} className="text-sm text-[--muted] flex items-start gap-2">
                            <span className="text-[--turmeric] flex-none">·</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div key="week" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {WORKOUT_DAYS.map((d, i) => {
              const isToday = i === today;
              return (
                <div key={i} className={cn("card", isToday && "border-[--turmeric] bg-[rgba(224,168,58,0.04)]", d.rest && "opacity-60")}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-[--muted]">
                      {d.name.slice(0, 3)}
                    </span>
                    {isToday && <span className="badge badge-gold">Today</span>}
                    {d.rest && <span className="badge badge-muted">Rest</span>}
                  </div>
                  <p className="font-display text-lg text-[--text] leading-tight">{d.focus}</p>
                  <p className="font-mono text-[0.65rem] text-[--muted] mt-1">{d.time}</p>
                  {!d.rest && <p className="font-mono text-[0.6rem] text-[--muted] mt-0.5">{d.blocks?.length ?? 0} blocks · {d.blocks?.reduce((a, b) => a + b.ex.length, 0)} exercises</p>}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WarmupBlock({ warmup }: { warmup: string[] }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className="card">
      <button onClick={() => setCollapsed((c) => !c)} className="w-full flex items-center justify-between">
        <span className="font-medium text-sm text-[--muted]">Warm-up (10 min)</span>
        {collapsed ? <ChevronDown size={16} className="text-[--muted]" /> : <ChevronUp size={16} className="text-[--muted]" />}
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <ul className="pt-3 space-y-1">
              {warmup.map((w, i) => <li key={i} className="text-sm text-[--muted] flex items-start gap-2"><span className="text-[--turmeric] flex-none">·</span>{w}</li>)}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
