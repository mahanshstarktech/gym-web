"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
      
      // If we are stuck in a loop, this stops the SW from continuing to serve bad cached pages
      if (sessionStorage.getItem("sw_killed") !== "true") {
        sessionStorage.setItem("sw_killed", "true");
        // Only reload once to clear the memory state
        setTimeout(() => window.location.reload(), 500);
      }
    }
  }, []);
  return null;
}
