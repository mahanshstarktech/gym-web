"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Dumbbell, UtensilsCrossed, TrendingUp, MoreHorizontal,
  Timer, Calendar, ShoppingCart, Droplets, Settings, ChevronLeft, ChevronRight,
  BookOpen, Activity, Ruler,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Today",
    items: [
      { href: "/", icon: Home, label: "Dashboard" },
      { href: "/today", icon: Activity, label: "Today's Plan" },
    ],
  },
  {
    label: "Training",
    items: [
      { href: "/workout", icon: Dumbbell, label: "Workout Plan" },
      { href: "/timer", icon: Timer, label: "Interval Timer" },
      { href: "/schedule", icon: Calendar, label: "Weekly Schedule" },
    ],
  },
  {
    label: "Nutrition",
    items: [
      { href: "/meals", icon: UtensilsCrossed, label: "Meal Plan" },
      { href: "/meals/log", icon: BookOpen, label: "Food Log" },
      { href: "/grocery", icon: ShoppingCart, label: "Grocery List" },
    ],
  },
  {
    label: "Progress",
    items: [
      { href: "/progress", icon: TrendingUp, label: "Weight & Body Fat" },
      { href: "/measurements", icon: Ruler, label: "Measurements" },
      { href: "/hydration", icon: Droplets, label: "Hydration" },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/more", icon: MoreHorizontal, label: "Settings & More" },
    ],
  },
];

export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/" || href === "/meals") return pathname === href;
    return pathname?.startsWith(href);
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ type: "spring", stiffness: 300, damping: 35 }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-panel border-r border-line overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-line min-h-[72px]">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-none">
          <img src="/icons/icon-192.png" alt="ForgeRX" className="w-full h-full object-cover" />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="font-display text-xl text-[--text]">ForgeRX</h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Sections */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="font-mono text-[0.6rem] uppercase tracking-widest text-[--muted] px-3 py-1.5 overflow-hidden"
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-[10px] mb-0.5 group transition-all duration-150 relative",
                    active
                      ? "bg-[rgba(224,168,58,0.1)] text-[--turmeric]"
                      : "text-[--muted] hover:bg-[--panel-2] hover:text-[--text]"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[--turmeric]"
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <item.icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.8}
                    className="flex-none"
                  />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-sm font-medium truncate overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-line p-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] text-[--muted] hover:bg-[--panel-2] hover:text-[--text] transition-colors duration-150"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : (
            <>
              <ChevronLeft size={18} />
              <span className="text-sm font-mono text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
