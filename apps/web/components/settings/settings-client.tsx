"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Info } from "lucide-react";

const VAPID_PUBLIC_KEY = "BDHdhmTSPC6q9q3ok0eYyygEGb5Bjyts7mfxzQxLIhJ1OfrxzBPOtx5JcHiPhVBtGcH26N4_ADAIbYy6nZHlRRA";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function SettingsClient() {
  const [subbed, setSubbed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setSubbed(true);
        });
      });
    }
  }, []);

  const subscribeToPush = async () => {
    if (!("serviceWorker" in navigator)) {
      alert("Push messaging isn't supported.");
      return;
    }

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // Send to server (we use a fake user ID for now since auth isn't wired to localstorage user id directly here)
      const apiUrl = process.env.NODE_ENV === "development" ? "http://localhost:8787/api/notifications/subscribe" : "/api/notifications/subscribe";
      
      await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "current-user", // Placeholder since we only have 1 active user mostly
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.toJSON().keys?.p256dh,
            auth: subscription.toJSON().keys?.auth,
          }
        })
      });

      setSubbed(true);
      alert("Notifications enabled successfully!");
    } catch (err) {
      console.error("Failed to subscribe:", err);
      alert("Failed to enable notifications. Ensure you are using a supported browser or added to Home Screen on iOS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-display text-xl text-[--text] mb-4">Background Notifications</h2>
        
        <div className="flex items-start gap-4 p-4 border border-[--line] rounded-xl bg-[--panel-2]">
          <div className="flex-none mt-1">
            {subbed ? <Bell size={24} className="text-[--sage]" /> : <BellOff size={24} className="text-[--muted]" />}
          </div>
          <div className="flex-1">
            <p className="font-medium text-[--text]">Reminders & Check-ins</p>
            <p className="font-mono text-[0.65rem] text-[--muted] mt-1 mb-3">
              Get notified when it's time to eat, drink water, or log your workout. Works even when the app is closed.
            </p>
            
            <button
              onClick={subscribeToPush}
              disabled={subbed || loading}
              className="px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[--turmeric] text-[--ink] hover:opacity-90"
            >
              {loading ? "Enabling..." : subbed ? "✓ Notifications Enabled" : "Enable Notifications"}
            </button>
          </div>
        </div>
        
        <div className="mt-4 flex gap-2 items-start p-3 rounded-lg bg-[rgba(96,165,250,0.05)] border border-[rgba(96,165,250,0.2)]">
          <Info size={14} className="text-[--sky] flex-none mt-0.5" />
          <p className="font-mono text-[0.6rem] text-[--sky]">
            <strong>iOS Users:</strong> You must add ForgeRX to your Home Screen using Safari's "Share" button before you can receive background notifications.
          </p>
        </div>
      </div>
    </div>
  );
}
