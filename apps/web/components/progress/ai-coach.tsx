"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_URL } from "@/lib/api";

// Types matching our stats engine output
export function AiCoach({
  workoutStats,
  nutritionStats,
}: {
  workoutStats: any;
  nutritionStats: any;
}) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchInsight = async (force = false) => {
    // Basic cache logic to avoid spamming Gemini on every render
    const cached = localStorage.getItem("lp_ai_insight");
    const cachedTime = localStorage.getItem("lp_ai_insight_time");
    const now = Date.now();

    if (!force && cached && cachedTime && now - parseInt(cachedTime) < 1000 * 60 * 30) {
      setInsight(cached);
      return;
    }

    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_URL}/api/ai/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workout: {
            sessions: workoutStats.totalSessions,
            streak: workoutStats.currentStreak,
            fatigueTrend: workoutStats.fatigueBySession.slice(-3), // last 3
          },
          nutrition: {
            calorieAdherence: nutritionStats.kcalAdherenceRate,
            proteinHitRate: nutritionStats.proteinHitRate,
            lateNightDays: nutritionStats.lateNightEatingDays,
          }
        }),
      });

      const data = await res.json();
      if (data.ok && data.insight) {
        setInsight(data.insight);
        localStorage.setItem("lp_ai_insight", data.insight);
        localStorage.setItem("lp_ai_insight_time", now.toString());
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  return (
    <div className="card relative overflow-hidden border-[--turmeric] shadow-lg shadow-[rgba(224,168,58,0.1)]">
      {/* Glow background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[--turmeric] opacity-[0.08] blur-3xl pointer-events-none" />
      
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 text-[--turmeric]">
          <Sparkles size={14} className="animate-pulse" />
          <h3 className="font-mono text-xs uppercase tracking-wider font-bold">AI Coach Insight</h3>
        </div>
        <button
          onClick={() => fetchInsight(true)}
          disabled={loading}
          className="text-[--muted] hover:text-[--text] transition-colors disabled:opacity-50"
          title="Refresh Insight"
        >
          <RefreshCw size={12} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading && !insight ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-3 flex flex-col gap-2"
          >
            <div className="h-3 w-3/4 bg-[--line] rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-[--line] rounded animate-pulse" />
          </motion.div>
        ) : error && !insight ? (
          <motion.p
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-[--paprika] py-2 font-mono"
          >
            Failed to connect to AI Coach.
          </motion.p>
        ) : (
          <motion.p
            key="insight"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-base font-medium text-[--text] leading-snug py-1"
          >
            {insight}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
