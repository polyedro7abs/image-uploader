# Publish loop improvements (Meta, infra)

Work carried over from branch `n8n`, with the n8n hop replaced by a direct
Meta Graph API call — social post publish loop from UI straight to Meta
(Facebook Page) and back. See **[direct-publish.md](./direct-publish.md)**
for the current architecture and env vars.

## Architecture

```
UI (Next.js :3001)
  → API (Hono :3000)
  → SQLite (posts)
  → Facebook platform → Meta Graph API POST /{page-id}/photos (in-process)
  → other platforms   → mocked
  → UI polls GET /posts every 3s
```

## App code added

| Piece | Location |
|-------|----------|
| Shared types | `packages/types` — `PostStatus`, `SocialPlatform`, Zod schemas |
| Posts API | `POST/GET/PATCH /posts`, `POST /posts/:id/publish` |
| Media upload | `POST /media/upload` → `public/uploads/` |
| Direct publish | `triggerPublishWorkflow` in `apps/server/src/lib/posts.ts` — calls Meta Graph API in-process |
| Scheduled publish | `apps/server/src/jobs/scheduler.ts` — node-cron every 60s, same `triggerPublishWorkflow` |
| Schedule API | `PATCH /posts/:id/schedule`, future `scheduledAt` on `POST /posts` |
| Test UI | `/dashboard/posts` — upload, platforms, publish now, status badges |
| Calendar UI | `/dashboard/calendar` — month view, schedule/reschedule/unschedule |
| FB verify script | `pnpm --filter server test:fb-publish` |

See **[direct-publish.md](./direct-publish.md)** for the full request flow
and env vars — there is no webhook payload or callback anymore, the
Graph API call and `finalizePost` happen in the same process.

## Meta / Facebook

| Item | Status |
|------|--------|
| Page | **Polyedro Test Page** |
| Permissions (dev) | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` — ready for testing |
| Verified endpoint | `POST /v19.0/{page-id}/photos` with Page token from **`GET /me/accounts`** |
| Instagram | **Skipped** — `instagram_business_content_publish` needs App Review; mocked |

### Lessons from FB testing

- Error **190** → corrupted / wrong token (User token vs Page token)
- Error **200 timelines** → User token or wrong Page ID
- **Working pair:** `id` + `access_token` from the **same** `/me/accounts` row
- **`mediaUrl` must be public HTTPS** — Meta cannot fetch `localhost` uploads

## Infrastructure / dev tooling

| Topic | Detail |
|-------|--------|
| **Node/pnpm** | nvm `~/.config/nvm`, symlinks in `~/.local/bin` |
| **Secrets** | Only in `apps/server/.env`, `apps/web/.env.local` — **never committed** |

## Docs map

| Doc | Topic |
|-----|--------|
| [baseline-summary.md](./baseline-summary.md) | Pre-feature repo state |
| [direct-publish.md](./direct-publish.md) | Direct Meta publish architecture (this branch) |
| [scheduled-publishing.md](./scheduled-publishing.md) | Cron scheduler + calendar UI |
| [database.md](./database.md) | Supabase/Postgres (production path) |

## E2E test (current)

1. `pnpm --filter server dev` + `pnpm --filter web dev`
2. `/dashboard/posts` — Facebook checked, public image URL (e.g. picsum)
3. **Publish Now** → `DRAFT` → `PUBLISHING` → `PUBLISHED`
4. Photo on Polyedro Test Page feed

## Not done yet

- Instagram real publish (App Review)
- Cloudinary / production media storage
- Long-lived Page token refresh
- Production Postgres deploy
- Hosted API URL (production deploy target)
- `GET /posts` filtering (calendar fetches all client-side)
- Automated scheduler tests
