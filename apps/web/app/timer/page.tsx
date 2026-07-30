import { TimerClient } from "@/components/timer/timer-client";

export default function TimerPage() {
  return (
    <div className="px-4 pt-6 pb-2 md:px-8 md:pt-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-[--muted] mb-1">Training</p>
        <h1 className="font-display text-4xl md:text-5xl text-[--text]">Interval Timer</h1>
      </header>
      <TimerClient />
    </div>
  );
}
