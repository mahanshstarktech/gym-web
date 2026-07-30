# Lean Protocol — PWA

A full-stack Progressive Web App for the 12-week Monsoon Cutting Cycle.

## Stack
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS v4
- **Backend**: Hono.js on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Hosting**: Cloudflare Pages (frontend) + Workers (backend)

## Getting Started

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 11
- Cloudflare account + Wrangler CLI authenticated

### Install
```bash
pnpm install
pnpm approve-builds  # approve esbuild, sharp, workerd
```

### Development

```bash
# Run frontend only (recommended for UI work)
cd apps/web && pnpm dev
# → http://localhost:3000

# Run API locally (requires wrangler login first)
cd apps/api && pnpm dev
# → http://localhost:8787
```

### First-time Cloudflare Setup (one-time)

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Create D1 database
npx wrangler d1 create lean-protocol-db
# Copy the database_id into apps/api/wrangler.jsonc

# 3. Create KV namespace
npx wrangler kv namespace create lean-protocol-sessions
# Copy the id into apps/api/wrangler.jsonc

# 4. Apply database migrations
cd apps/api && pnpm db:migrate:local
```

### Deployment

```bash
# Deploy API to Cloudflare Workers
cd apps/api && pnpm deploy

# Deploy frontend to Cloudflare Pages
# Push to GitHub → auto-deploys via Cloudflare Pages integration
```

## Project Structure

```
lean-protocol/
├── apps/
│   ├── web/          ← Next.js 16 PWA
│   │   ├── app/      ← App Router pages
│   │   ├── components/
│   │   └── lib/
│   └── api/          ← Hono on Cloudflare Workers
│       ├── src/
│       │   ├── routes/   ← API endpoints
│       │   ├── db/       ← Drizzle schema + client
│       │   ├── middleware/
│       │   └── utils/
│       └── wrangler.jsonc
└── packages/
    └── shared/       ← Zod schemas shared between web + api
```

## PWA Installation (Mobile)

1. Open `https://lean-protocol.pages.dev` in Safari (iOS) or Chrome (Android)
2. Tap Share → "Add to Home Screen" (iOS) or the install banner (Android)
3. The app installs as a native-like app with offline support

## Features

- 🏠 **Dashboard** — Today's overview, streaks, macro rings, quick access
- 💪 **Workout** — Day's exercise plan with block checkboxes + weekly view
- ⏱ **Interval Timer** — Animated SVG ring timer with work/rest/rounds
- 🍽 **Meal Plan** — Full 7-day meal schedule with badges
- 📝 **Food Log** — Mark meals eaten, smart next-meal banner, live macro bars
- 📈 **Progress** — Weight/BF% chart (Recharts), log form, data table
- 💧 **Hydration** — Water glass tracker
- 🛒 **Grocery** — Weekly shopping list
- ⚙️ **Settings** — Targets, theme, notifications
- ☁️ **Cloud Sync** — Automatic sync via Cloudflare D1 (when logged in)
- 🔔 **PWA** — Installable, offline-capable, push-notification ready
