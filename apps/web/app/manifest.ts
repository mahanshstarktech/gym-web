import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lean Protocol",
    short_name: "Lean Protocol",
    description: "Your personal monsoon cutting cycle tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#09181a",
    theme_color: "#09181a",
    orientation: "portrait",
    categories: ["fitness", "health", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Log Workout",
        url: "/workout",
        description: "View today's workout",
        icons: [{ src: "/icons/shortcut-workout.png", sizes: "96x96" }],
      },
      {
        name: "Food Log",
        url: "/meals/log",
        description: "Mark meals as eaten",
        icons: [{ src: "/icons/shortcut-meals.png", sizes: "96x96" }],
      },
      {
        name: "Log Progress",
        url: "/progress",
        description: "Track weight and body fat",
        icons: [{ src: "/icons/shortcut-progress.png", sizes: "96x96" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/home.png",
        sizes: "390x844",
        type: "image/png",
        // @ts-ignore — form_factor is valid but not yet in TS types
        form_factor: "narrow",
      },
    ],
  };
}
