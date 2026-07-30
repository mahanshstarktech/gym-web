"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { DesktopSidebar } from "./desktop-sidebar";
import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show nav on auth pages
  const isAuthPage = pathname?.startsWith("/login") || pathname?.startsWith("/register");

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar — hidden on mobile */}
      {!isAuthPage && (
        <div className="hidden md:block">
          <DesktopSidebar />
        </div>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 min-w-0 transition-all duration-300 ${
          isAuthPage ? "" : "main-content"
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav — hidden on desktop */}
      {!isAuthPage && (
        <div className="md:hidden">
          <BottomNav />
        </div>
      )}
    </div>
  );
}
