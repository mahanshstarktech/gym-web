"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ShoppingCart, Settings, BookOpen, Timer, Calendar,
  Droplets, ChevronRight, Download, CloudUpload, HelpCircle, Ruler
} from "lucide-react";

const menuItems = [
  { icon: ShoppingCart, label: "Grocery List", sub: "Weekly shopping guide", href: "/grocery", color: "var(--sage)" },
  { icon: Calendar, label: "Weekly Schedule", sub: "Full 7-day overview", href: "/schedule", color: "var(--sky)" },
  { icon: Timer, label: "Interval Timer", sub: "Quick access to timer", href: "/timer", color: "var(--turmeric)" },
  { icon: Droplets, label: "Hydration", sub: "Water intake tracker", href: "/hydration", color: "var(--sky)" },
  { icon: Ruler, label: "Measurements", sub: "Body measurements log", href: "/measurements", color: "var(--muted)" },
  { icon: CloudUpload, label: "Sync & Backup", sub: "Cloud sync settings", href: "/sync", color: "var(--turmeric)" },
  { icon: HelpCircle, label: "Reality Check", sub: "FAQ & science behind the plan", href: "/faq", color: "var(--muted)" },
  { icon: Download, label: "Export Data", sub: "Download your progress as CSV", href: "/export", color: "var(--sage)" },
  { icon: Settings, label: "Settings", sub: "Targets, theme, notifications", href: "/settings", color: "var(--paprika)" },
];

export function MoreClient() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {menuItems.map((item, i) => (
        <motion.div
          key={item.href}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
        >
          <Link href={item.href}>
            <div className="card flex items-center gap-4 hover:border-[--line-strong] transition-all duration-150 group cursor-pointer">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-none"
                style={{ background: `${item.color}18`, border: `1px solid ${item.color}30` }}
              >
                <item.icon size={18} style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-[--text] group-hover:text-[--turmeric] transition-colors">{item.label}</p>
                <p className="font-mono text-[0.65rem] text-[--muted] truncate">{item.sub}</p>
              </div>
              <ChevronRight size={16} className="text-[--muted] group-hover:text-[--turmeric] transition-colors flex-none" />
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
