import { MeasurementsClient } from "@/components/measurements/measurements-client";

export default function MeasurementsPage() {
  return (
    <div className="px-4 pt-6 pb-2 md:px-8 md:pt-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-[--muted] mb-1">Progress</p>
        <h1 className="font-display text-4xl md:text-5xl text-[--text]">Measurements</h1>
        <p className="text-[--muted] text-sm mt-1">Track body measurements weekly to see body recomposition beyond the scale.</p>
      </header>
      <MeasurementsClient />
    </div>
  );
}
