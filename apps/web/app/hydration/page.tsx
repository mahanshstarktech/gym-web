import { HydrationClient } from "@/components/hydration/hydration-client";

export default function HydrationPage() {
  return (
    <div className="px-4 pt-6 pb-2 md:px-8 md:pt-8 max-w-2xl mx-auto">
      <header className="mb-6">
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-[--muted] mb-1">Progress</p>
        <h1 className="font-display text-4xl md:text-5xl text-[--text]">Hydration</h1>
        <p className="text-[--muted] text-sm mt-1">Target ~3.5L on training days. Tap a drop as you finish a glass (~350ml each).</p>
      </header>
      <HydrationClient />
    </div>
  );
}
