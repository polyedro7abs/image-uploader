# Polyedro-abs

Social post automation monorepo — [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) (Next.js, Hono, Turborepo, shared shadcn UI).

**Branch `n8n`:** publish loop — UI → API → n8n → Facebook Page → callback → live status.

## Quick start

```bash
pnpm install
cp apps/server/.env.example apps/server/.env      # paste secrets locally
cp apps/web/.env.example apps/web/.env.local
pnpm --filter server db:push
pnpm dev
```

- Web: [http://localhost:3001](http://localhost:3001)
- API: [http://localhost:3000](http://localhost:3000)
- Test UI: [http://localhost:3001/dashboard/posts](http://localhost:3001/dashboard/posts)

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/baseline-summary.md](./docs/baseline-summary.md) | Repo state **before** the publish loop |
| [docs/publish-loop-improvements.md](./docs/publish-loop-improvements.md) | **Latest** — n8n, Meta API, infra, E2E |
| [docs/n8n-workflow.md](./docs/n8n-workflow.md) | n8n node setup (Facebook + callback) |
| [docs/ngrok-tunnel.md](./docs/ngrok-tunnel.md) | Expose API on 443 for n8n callbacks |
| [docs/cloudflare-tunnel.md](./docs/cloudflare-tunnel.md) | Cloudflare tunnel (port 7844 notes) |
| [docs/database.md](./docs/database.md) | Postgres/Supabase (production path) |

> **AI / full local context** (secrets by location, not in git):  
> `~/Polyedro-ads-context/claude.md`

## Project structure

```
Polyedro-ads/
├── apps/
│   ├── web/              Next.js :3001, dashboard/posts
│   └── server/           Hono :3000, posts API, n8n webhook/callback
├── packages/
│   ├── types/            @Polyedro-abs/types (Post, Zod)
│   ├── ui/               @Polyedro-abs/ui (shadcn)
│   ├── env/              @Polyedro-abs/env
│   └── config/
├── docs/                 Architecture & runbooks
└── scripts/              Dev helpers (e.g. update APP_PUBLIC_URL)
```

## Features

- **TypeScript** — shared types across web and server
- **Publish loop** — upload media, create post, publish via n8n, poll status
- **Mock mode** — leave `N8N_WEBHOOK_URL` empty for local 2s simulate
- **Facebook Page publish** — verified via `pnpm --filter server test:fb-publish`
- **Instagram** — mocked in n8n until Meta App Review

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Web + server |
| `pnpm dev:web` | Next.js only |
| `pnpm dev:server` | Hono only |
| `pnpm check-types` | Typecheck monorepo |
| `pnpm --filter server test:fb-publish` | Smoke test Meta Page photo post |
| `pnpm --filter server db:push` | Apply SQLite schema |

## Environment variables (never commit secrets)

Templates only in repo — paste real values in local files:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local
```

| Variable | App | Description |
|----------|-----|-------------|
| `DATABASE_URL` | server | Local: `file:./dev.db`. Prod: `postgresql://...` |
| `CORS_ORIGIN` | server | e.g. `http://localhost:3001` |
| `N8N_WEBHOOK_URL` | server | n8n webhook URL (empty = mock mode) |
| `APP_PUBLIC_URL` | server | Public HTTPS URL for n8n callbacks (ngrok) |
| `FB_PAGE_ID` | server | Facebook Page ID (webhook `businessId` + FB test script) |
| `FB_PAGE_ACCESS_TOKEN` | server | Page token for `test:fb-publish` only |
| `NEXT_PUBLIC_SERVER_URL` | web | e.g. `http://localhost:3000` |

Also set in **n8n Cloud env:** `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`, `APP_PUBLIC_URL`.

## UI customization

Shared components: `@Polyedro-abs/ui/components/*`

```bash
npx shadcn@latest add accordion dialog -c packages/ui
```

```tsx
import { Button } from "@Polyedro-abs/ui/components/button";
```

Tokens and globals: `packages/ui/src/styles/globals.css`
