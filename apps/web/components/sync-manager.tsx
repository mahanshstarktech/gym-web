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

/** Collect all syncable keys currently in localStorage */
function collectLocalState(): Record<string, any> {
  const result: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !shouldSyncKey(key)) continue;
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try { result[key] = JSON.parse(raw); }
    catch { result[key] = raw; }
  }
  return result;
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

  // ── 3. Pull from server, then push local state up ──────────────────────────
  useEffect(() => {
    if (isAuthenticated !== true || synced) return;

    const proto = Object.getPrototypeOf(localStorage);
    const nativeSetItem = proto.setItem.bind(localStorage);

    fetchApi<Record<string, any>>("/api/sync/kv")
      .then((serverState) => {
        // Merge server into local (server wins for keys that exist on server)
        for (const [key, value] of Object.entries(serverState)) {
          const serialized = typeof value === "string" ? value : JSON.stringify(value);
          const local = localStorage.getItem(key);
          if (local !== serialized) {
            nativeSetItem(key, serialized);
          }
        }
        if (Object.keys(serverState).length > 0) {
          window.dispatchEvent(new StorageEvent("storage", { key: "lp_sync_complete" }));
        }

        // Push ALL local data up to server (covers first-time sync from laptop)
        const localState = collectLocalState();
        if (Object.keys(localState).length > 0) {
          fetchApi("/api/sync/kv", {
            method: "POST",
            body: JSON.stringify({ updates: localState }),
          }).catch(console.error);
        }

        setSynced(true);
      })
      .catch(() => {
        // Even if pull fails, try to push local data
        const localState = collectLocalState();
        if (Object.keys(localState).length > 0) {
          fetchApi("/api/sync/kv", {
            method: "POST",
            body: JSON.stringify({ updates: localState }),
          }).catch(console.error);
        }
        setSynced(true);
      });
  }, [isAuthenticated, synced]);

  // ── 4. Push interceptor — catch all future localStorage writes ─────────────
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

  if (isAuthenticated === null) return null;
  return <>{children}</>;
}
