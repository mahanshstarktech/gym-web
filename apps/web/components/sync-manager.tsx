"use client";

import { useEffect, useRef, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

// Keys to sync across devices
const SYNC_KEYS = ["lp_start", "lp_theme", "lp_entries", "lp_streak"];
const SYNC_PREFIXES = ["lp_water_", "lp_food_log_", "lp_workout_"];

function shouldSyncKey(key: string) {
  return SYNC_KEYS.includes(key) || SYNC_PREFIXES.some((p) => key.startsWith(p));
}

export function SyncManager({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [synced, setSynced] = useState(false);
  const pendingUpdates = useRef<Record<string, any>>({});
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patchedRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  // ── 1. Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchApi("/api/auth/me")
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  // ── 2. Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated === false) {
      if (pathname !== "/login" && pathname !== "/register") {
        router.push("/login");
      }
    }
  }, [isAuthenticated, pathname, router]);

  // ── 3. Initial pull from server ────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated !== true || synced) return;

    fetchApi<Record<string, any>>("/api/sync/kv")
      .then((serverState) => {
        const entries = Object.entries(serverState);
        if (entries.length > 0) {
          for (const [key, value] of entries) {
            const serialized = typeof value === "string" ? value : JSON.stringify(value);
            const local = localStorage.getItem(key);
            // Server wins: merge only keys that differ
            if (local !== serialized) {
              // Use original setItem to avoid re-triggering our patch
              Object.getPrototypeOf(localStorage).setItem.call(localStorage, key, serialized);
            }
          }
          // Notify all components to re-read localStorage
          window.dispatchEvent(new StorageEvent("storage", { key: "lp_sync_complete" }));
        }
        setSynced(true);
      })
      .catch(() => {
        setSynced(true); // Still let app render if pull fails
      });
  }, [isAuthenticated, synced]);

  // ── 4. Push interceptor ────────────────────────────────────────────────────
  useEffect(() => {
    if (!synced || isAuthenticated !== true || patchedRef.current) return;
    patchedRef.current = true;

    const proto = Object.getPrototypeOf(localStorage);
    const originalSetItem = proto.setItem;
    const originalRemoveItem = proto.removeItem;

    const pushUpdates = () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
      syncTimeout.current = setTimeout(async () => {
        const updates = { ...pendingUpdates.current };
        pendingUpdates.current = {};
        if (Object.keys(updates).length === 0) return;

        try {
          await fetchApi("/api/sync/kv", {
            method: "POST",
            body: JSON.stringify({ updates }),
          });
        } catch {
          // Re-queue on failure
          Object.assign(pendingUpdates.current, updates);
        }
      }, 1500);
    };

    proto.setItem = function (key: string, value: string) {
      originalSetItem.call(this, key, value);
      if (shouldSyncKey(key)) {
        try { pendingUpdates.current[key] = JSON.parse(value); }
        catch { pendingUpdates.current[key] = value; }
        pushUpdates();
      }
    };

    proto.removeItem = function (key: string) {
      originalRemoveItem.call(this, key);
      if (shouldSyncKey(key)) {
        pendingUpdates.current[key] = null;
        pushUpdates();
      }
    };

    return () => {
      proto.setItem = originalSetItem;
      proto.removeItem = originalRemoveItem;
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
      patchedRef.current = false;
    };
  }, [synced, isAuthenticated]);

  // Don't render until auth is resolved
  if (isAuthenticated === null) return null;

  return <>{children}</>;
}
