"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ShoppingCart } from "lucide-react";
import { GROCERY } from "@/lib/data";
import { cn } from "@/lib/utils";

export function GroceryClient() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const totalItems = GROCERY.reduce((a, g) => a + g.items.length, 0);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="card flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[rgba(127,176,140,0.12)] flex items-center justify-center flex-none">
          <ShoppingCart size={22} className="text-[--sage]" />
        </div>
        <div>
          <p className="font-display text-2xl text-[--text]">{checkedCount} / {totalItems} items</p>
          <p className="font-mono text-xs text-[--muted]">Tick off as you shop</p>
        </div>
        <div className="ml-auto">
          <div className="progress-bar w-24">
            <motion.div
              className="progress-fill protein"
              animate={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Groups */}
      {GROCERY.map((group, gi) => {
        const groupChecked = group.items.filter((_, ii) => checked[`${gi}-${ii}`]).length;
        return (
          <motion.div
            key={group.group}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.06 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg text-[--text]">{group.group}</h2>
              <span className="font-mono text-xs text-[--muted]">{groupChecked}/{group.items.length}</span>
            </div>
            <div className="space-y-1">
              {group.items.map((item, ii) => {
                const key = `${gi}-${ii}`;
                const done = !!checked[key];
                return (
                  <motion.button
                    key={ii}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggle(key)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150 group",
                      done ? "opacity-50" : "hover:bg-[--panel-2]"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-none transition-all",
                      done ? "bg-[--sage] border-[--sage]" : "border-[--line] group-hover:border-[--sage]"
                    )}>
                      {done && <Check size={12} strokeWidth={3} className="text-[--ink]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-sm text-[--text]", done && "line-through")}>{item.item}</span>
                    </div>
                    <span className="font-mono text-[0.65rem] text-[--muted] flex-none">{item.qty}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {checkedCount === totalItems && totalItems > 0 && (
        <div className="card text-center py-6 border-[--sage] bg-[rgba(127,176,140,0.05)]">
          <p className="font-display text-2xl text-[--sage]">✓ Shopping complete!</p>
          <p className="font-mono text-xs text-[--muted] mt-1">All {totalItems} items checked off</p>
        </div>
      )}
    </div>
  );
}
