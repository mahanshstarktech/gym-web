"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home, Dumbbell, UtensilsCrossed, TrendingUp, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/workout", icon: Dumbbell, label: "Train" },
  { href: "/meals", icon: UtensilsCrossed, label: "Eat" },
  { href: "/progress", icon: TrendingUp, label: "Stats" },
  { href: "/more", icon: MoreHorizontal, label: "More" },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass bottom-nav">
      <div className="flex items-stretch justify-around h-[4.5rem]">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 relative transition-colors duration-200",
                active ? "text-[--turmeric]" : "text-[--muted]"
              )}
            >
              {/* Active indicator pill above icon */}
              {active && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[--turmeric]"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <tab.icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.8}
                  className={active ? "text-[--turmeric]" : "text-[--muted]"}
                />
              </motion.div>
              <span
                className={cn(
                  "font-mono text-[0.6rem] uppercase tracking-wider transition-colors",
                  active ? "text-[--turmeric]" : "text-[--muted]"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
