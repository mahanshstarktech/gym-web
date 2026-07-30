"use client";

import { useEffect, useRef, useState } from "react";
import { fetchApi } from "@/lib/api";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";

// These are the keys we want to sync across devices
const SYNC_KEYS = [
  "lp_start",
  "lp_theme",
  "lp_entries",
  "lp_streak",
];
// Dynamic keys that start with these prefixes
const SYNC_PREFIXES = [
  "lp_water_",
  "lp_food_log_",
  "lp_workout_",
];

function shouldSyncKey(key: string) {
  if (SYNC_KEYS.includes(key)) return true;
  if (SYNC_PREFIXES.some(p => key.startsWith(p))) return true;
  return false;
}

export function SyncManager({ children }: { children: React.ReactNode }) {
  const [synced, setSynced] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pendingUpdates = useRef<Record<string, any>>({});
  const syncTimeout = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check auth status
    fetchApi("/api/auth/me")
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false));
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      if (pathname !== "/login" && pathname !== "/register") {
        router.push("/login");
      }
      return;
    }

    if (isAuthenticated === true && !synced) {
      // 1. Initial Pull from Server
      fetchApi<Record<string, any>>("/api/sync/kv")
        .then((serverState) => {
          let merged = false;
          // Merge server state into local storage if server has data
          for (const [key, value] of Object.entries(serverState)) {
            const local = localStorage.getItem(key);
            // Very basic conflict resolution: server wins on initial load
            // (A real app would use timestamps, but this is fine for a single user)
            if (value !== null && JSON.stringify(value) !== local) {
              localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
              merged = true;
            }
          }
          if (merged) {
            toast.success("Synced with cloud");
            // Force re-render of components reading from localStorage
            window.dispatchEvent(new Event("storage"));
          }
          setSynced(true);
        })
        .catch((err) => {
          console.error("Initial sync failed", err);
          setSynced(true); // Let app load anyway
        });
    }
  }, [isAuthenticated, synced, pathname, router]);

  useEffect(() => {
    if (!synced || !isAuthenticated) return;

    // 2. Monkey-patch localStorage to intercept writes and queue them for cloud sync
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;

    const queueSync = () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
      syncTimeout.current = setTimeout(async () => {
        const updates = { ...pendingUpdates.current };
        pendingUpdates.current = {}; // clear queue
        
        if (Object.keys(updates).length > 0) {
          try {
            await fetchApi("/api/sync/kv", {
              method: "POST",
              body: JSON.stringify({ updates })
            });
          } catch (err) {
            console.error("Failed to push sync", err);
            // Re-queue on failure
            Object.assign(pendingUpdates.current, updates);
          }
        }
      }, 2000); // Debounce syncs by 2 seconds
    };

    localStorage.setItem = function(key: string, value: string) {
      originalSetItem.apply(this, [key, value]);
      if (shouldSyncKey(key)) {
        try {
          pendingUpdates.current[key] = JSON.parse(value);
        } catch {
          pendingUpdates.current[key] = value;
        }
        queueSync();
      }
    };

    localStorage.removeItem = function(key: string) {
      originalRemoveItem.apply(this, [key]);
      if (shouldSyncKey(key)) {
        pendingUpdates.current[key] = null;
        queueSync();
      }
    };

    return () => {
      // Cleanup
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
    };
  }, [synced, isAuthenticated]);

  // Don't render children until auth is checked, to prevent flash of wrong data
  if (isAuthenticated === null) return null;
  
  return <>{children}</>;
}
