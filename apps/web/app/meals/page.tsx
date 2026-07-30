import { MealsClient } from "@/components/meals/meals-client";

export default function MealsPage() {
  return (
    <div className="px-4 pt-6 pb-2 md:px-8 md:pt-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <p className="font-mono text-[0.65rem] uppercase tracking-widest text-[--muted] mb-1">Nutrition</p>
        <h1 className="font-display text-4xl md:text-5xl text-[--text]">Meal Plan</h1>
      </header>
      <MealsClient />
    </div>
  );
}
