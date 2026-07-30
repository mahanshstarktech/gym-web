import { greeting, todayKey } from "@/lib/utils";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default function HomePage() {
  const today = new Date();
  const dayName = today.toLocaleDateString("en-IN", { weekday: "long" });
  const dateStr = today.toLocaleDateString("en-IN", { day: "numeric", month: "long" });

  return (
    <div className="px-4 pt-6 pb-2 md:px-8 md:pt-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-[--muted] mb-1">
          Lean Protocol · Monsoon Cycle
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-[--text] leading-none mb-1">
          {greeting()}, Mahansh
        </h1>
        <p className="text-[--muted] text-sm">
          {dayName}, {dateStr}
        </p>
      </header>

      <DashboardClient />
    </div>
  );
}
