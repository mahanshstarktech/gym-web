import { ProgressClient } from "@/components/progress/progress-client";

export default function ProgressPage() {
  return (
    <div className="px-4 pt-6 pb-2 md:px-8 md:pt-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-[--muted] mb-1">Progress</p>
        <h1 className="font-display text-4xl md:text-5xl text-[--text]">Body Stats</h1>
      </header>
      <ProgressClient />
    </div>
  );
}
