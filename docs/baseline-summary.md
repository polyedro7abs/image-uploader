# Baseline summary (pre–publish loop)

What **Polyedro-ads** looked like before the social publish feature on branch `n8n`.

## Origin

Scaffolded with [Better-T-Stack](https://www.better-t-stack.dev/) (Turborepo, Next.js, Hono, shared UI). Initial stack config had **no database, no ORM, no API routes** beyond health checks.

## Monorepo layout (original)

```
Polyedro-ads/
├── apps/
│   ├── web/          Next.js :3001
│   └── server/       Hono :3000
├── packages/
│   ├── ui/           @Polyedro-abs/ui (shadcn)
│   ├── env/          @Polyedro-abs/env (t3 env + Zod)
│   └── config/       shared tsconfig
```

## What existed

| Area | State |
|------|--------|
| **Web** | Landing page, theme toggle, header — no dashboard |
| **Server** | `GET /`, `GET /health/db`, CORS for `:3001` |
| **Database** | Later added **Postgres/Supabase + Drizzle** on `main` (`docs/database.md`) |
| **Types package** | Did not exist |
| **n8n / Meta** | Not integrated |
| **Env** | `DATABASE_URL` (Postgres), `CORS_ORIGIN`, `DIRECT_URL` |

## Intended direction (first spec)

Build an end-to-end **publish loop**:

1. Upload media → create post → publish
2. Server triggers **n8n webhook**
3. n8n handles social APIs (later) and **callbacks** to the app
4. UI polls and shows status

Shared `@Polyedro-abs/types`, Prisma/SQLite was discussed but **not adopted** — local dev uses **Drizzle + SQLite** (`file:./dev.db`).

## Gap before improvements

- No `Post` model or routes
- No test UI for posts
- No n8n webhook or callback endpoints
- No mock publish mode for offline testing
- No tunnel docs (ngrok / Cloudflare)
- No Facebook verification tooling

See **[publish-loop-improvements.md](./publish-loop-improvements.md)** for what was built on top of this baseline.
