import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function timeToMinutes(timeStr: string): number {
  const clean = timeStr.replace(/\s*·.*/, "").trim();
  const m = clean.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return -1;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

export function parseMacros(macroStr: string) {
  const kcal = parseFloat((macroStr.match(/~?([\d.]+)\s*kcal/i) || [])[1] || "0");
  const protein = parseFloat((macroStr.match(/~?([\d.]+)\s*g\s*protein/i) || [])[1] || "0");
  return { kcal, protein };
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
