import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/sw-registrar";
import { SyncManager } from "@/components/sync-manager";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lean Protocol — Monsoon Training Cycle",
  description: "Your personal cutting cycle tracker. Workout plans, meal logs, progress tracking — all in one installable app.",
  applicationName: "Lean Protocol",
  authors: [{ name: "Lean Protocol" }],
  keywords: ["fitness", "workout", "meal plan", "cutting cycle", "PWA"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lean Protocol",
  },
  openGraph: {
    type: "website",
    title: "Lean Protocol",
    description: "Personal monsoon cutting cycle tracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#09181a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bebasNeue.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-ink text-text antialiased">
        <Providers>
          <ServiceWorkerRegistrar />
          <SyncManager>
            <AppShell>{children}</AppShell>
          </SyncManager>
          <Toaster
            theme="dark"
            toastOptions={{
              style: { background: "#112629", border: "1px solid rgba(232,229,217,0.10)", color: "#f2efe6" },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
