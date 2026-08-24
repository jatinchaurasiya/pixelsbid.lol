# PixelsBid.lol — Rent pixels. Own the canvas. $1/pixel.

A **production-ready** Next.js 15 pixel-rental canvas. 1000×1000 live grid, square-only selection, `size² × $1` pricing, 30-day leases, biggest-pixel leaderboard, and full root-fix hardening from day one.

> Inspired by **Million Dollar Homepage** (spatial ownership) + **outbid.lol** (live leaderboard, transparency, viral loop) — rebuilt for recurring revenue.

---

## ✨ Features

- **Live canvas** — HTML5 `<canvas>` with pan/zoom, viewport culling, grid snapping; 1M cells stays smooth on mobile (no DOM nodes).
- **Square-only drag** — width always equals height; red overlay if overlapping; snaps to pixel grid.
- **Pricing** — `size² × $1` (configurable to linear) via `canvas_config` table. 1×1=$1 · 2×2=$4 · 10×10=$100 · 50×50=$2,500.
- **10-min reservation lock** — `EXCLUDE USING gist (region WITH &&)` makes overlapping `reserved/pending_review/active` blocks impossible at DB layer.
- **Dodo Payments** — dynamic checkout, webhook idempotent on `dodo_payment_id`, mock fallback if keys missing.
- **Moderation queue** — neutral placeholder until `pending_review → active`; instant takedown + refund on reject.
- **Leaderboard (biggest wins)** — ranked by `size DESC, priceCents DESC`; each block has SEO page `/block/[id]` + `sitemap.xml`.
- **Live stats bar** — viewers/visitors/fill%/revenue via `GET /api/stats` polling (SSE-ready) decoupled from analytics.
- **Better Auth** — Google OAuth + email/password backed by Neon via `drizzleAdapter`; works in mock mode without DB.
- **Vercel-ready** — `vercel.json` cron `* * * * *` hits `/api/cron/sweep` to clear expired reservations/leases.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router + TypeScript |
| Styling | Tailwind CSS 4 |
| DB | Neon Postgres (serverless) + Drizzle ORM |
| Auth | Better Auth (Drizzle adapter) |
| Payments | Dodo Payments (MoR) + `standardwebhooks` |
| Hosting | Vercel (EC2 path documented, stateless) |
| Storage | S3 presigned URLs (imageUrl paste in demo) |

---

## Data model (Neon)

See `src/db/schema.ts` — includes `canvas_config`, `pixel_blocks` with `EXCLUDE USING gist`, `orders`, `moderation_queue`, `site_stats`, plus Better Auth `user/session/account/verification`. The `region box GENERATED ALWAYS AS ... STORED` + exclusion is the single most important line.

## Quick start (demo without keys)

```bash
npm install
npm run dev
# open http://localhost:3000
# Drag a square → Reserve & Pay → mock checkout redirects to /block/[id]
# No DATABASE_URL or DODO keys needed — in-memory mockStore seeds 8 blocks.
```

## Production env

Copy `.env.example` → `.env.local` and fill:

```
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://pixelsbid.lol
NEXT_PUBLIC_APP_URL=https://pixelsbid.lol
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DODO_PAYMENTS_API_KEY=...
DODO_WEBHOOK_SECRET=...
CRON_SECRET=...
```

Then:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate   # or push
npm run build
vercel deploy
```

Set Dodo webhook to `https://pixelsbid.lol/api/webhooks/dodo`.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Canvas + filters + selection → `/rent/[id]` |
| `/rent/[id]` | Form (title, URL, image, category) → Dodo overlay |
| `/block/[id]` | SEO page + click tracking via `/api/blocks/click?id=` |
| `/dashboard` | Your blocks, expiry countdown, renew |
| `/leaderboard` | Biggest squares (also on homepage) |
| `/stats` | Visitors/fill/revenue + 14-day charts |
| `/rules`, `/about`, `/terms`, `/privacy`, `/refund` | Legal + transparency |
| `/admin` | Moderation queue (role-gate in prod) |
| `/api/canvas`, `/api/stats`, `/api/leaderboard` | Live data |
| `/api/reservations` | POST x,y,size |
| `/api/checkout` | Create Dodo session |
| `/api/webhooks/dodo` | Idempotent payment.succeeded handler |
| `/api/cron/sweep` | Vercel cron expiry sweeper |

## Pricing & lease config

Edit `canvas_config` row (id=1): `width`, `height`, `unit_price_cents`, `pricing_mode` (`squared|linear`), `lease_days`, `min_size`, `max_size`. No code change needed.

## Scale-out

App is stateless — sessions/reservations live in Postgres/Redis, not server memory. Add ALB + ASG with same Docker image; externalize Redis to ElastiCache. No app changes.

## License

Private — PixelsBid.lol
