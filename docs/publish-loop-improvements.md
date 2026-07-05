# Publish loop improvements (n8n, Meta, infra)

Latest work on branch **`n8n`** — social post publish loop from UI through n8n to Meta (Facebook Page) and back.

## Architecture

```
UI (Next.js :3001)
  → API (Hono :3000)
  → SQLite (posts)
  → n8n Cloud webhook
       → IF facebook → Meta Graph API POST /{page-id}/photos
       → POST /webhooks/n8n-callback (via ngrok APP_PUBLIC_URL)
  → UI polls GET /posts every 3s
```

## App code added

| Piece | Location |
|-------|----------|
| Shared types | `packages/types` — `PostStatus`, `SocialPlatform`, Zod schemas |
| Posts API | `POST/GET/PATCH /posts`, `POST /posts/:id/publish` |
| Media upload | `POST /media/upload` → `public/uploads/` |
| n8n callback | `POST /webhooks/n8n-callback` |
| Mock mode | Empty `N8N_WEBHOOK_URL` → 2s delay, 80/20 PUBLISHED/FAILED |
| Test UI | `/dashboard/posts` — upload, platforms, publish, status badges |
| FB verify script | `pnpm --filter server test:fb-publish` |

### Publish webhook payload (to n8n)

```json
{
  "postId": "uuid",
  "mediaUrl": "https://...",
  "caption": "...",
  "platforms": ["facebook", "instagram"],
  "businessId": "<FB_PAGE_ID from server env>",
  "callbackUrl": "<APP_PUBLIC_URL>/webhooks/n8n-callback"
}
```

- `platforms` sent **lowercase** for n8n IF conditions
- `platformResults` optional on callback

## n8n workflow (configuration)

Documented in **[n8n-workflow.md](./n8n-workflow.md)**.

| Node | Purpose |
|------|---------|
| Webhook | Receives publish payload |
| IF | `platforms.includes('facebook')` |
| HTTP Request | Meta `POST /v19.0/{FB_PAGE_ID}/photos` (form: url, caption, access_token) |
| HTTP Request | Success → callback `PUBLISHED` + `platformResults.facebook` |
| HTTP Request | Error / false branch → callback `FAILED` or mock `PUBLISHED` |

n8n env vars (not in git): `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`, `APP_PUBLIC_URL`.

## Meta / Facebook

| Item | Status |
|------|--------|
| Page | **Polyedro Test Page** |
| Permissions (dev) | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` — ready for testing |
| Verified endpoint | `POST /v19.0/{page-id}/photos` with Page token from **`GET /me/accounts`** |
| Instagram | **Skipped** — `instagram_business_content_publish` needs App Review; mocked in n8n false branch |

### Lessons from FB testing

- Error **190** → corrupted / wrong token (User token vs Page token)
- Error **200 timelines** → User token or wrong Page ID
- **Working pair:** `id` + `access_token` from the **same** `/me/accounts` row
- **`mediaUrl` must be public HTTPS** — Meta cannot fetch `localhost` uploads without ngrok

## Infrastructure / dev tooling

| Topic | Detail |
|-------|--------|
| **Node/pnpm** | nvm `~/.config/nvm`, symlinks in `~/.local/bin` |
| **Cloudflare tunnel** | Named tunnel `polyedro-dev` — **blocked** on outbound port **7844** on this network |
| **ngrok** | Works on **443** — use for `APP_PUBLIC_URL` and n8n callbacks |
| **Secrets** | Only in `apps/server/.env`, `apps/web/.env.local`, n8n Cloud env — **never committed** |

## Docs map

| Doc | Topic |
|-----|--------|
| [baseline-summary.md](./baseline-summary.md) | Pre-feature repo state |
| [n8n-workflow.md](./n8n-workflow.md) | n8n node-by-node setup |
| [ngrok-tunnel.md](./ngrok-tunnel.md) | ngrok for callbacks |
| [cloudflare-tunnel.md](./cloudflare-tunnel.md) | Cloudflare (7844 troubleshooting) |
| [database.md](./database.md) | Supabase/Postgres (production path) |

## E2E test (current)

1. `ngrok http 3000` → set `APP_PUBLIC_URL` (server + n8n)
2. `pnpm --filter server dev` + `pnpm --filter web dev`
3. `/dashboard/posts` — Facebook checked, public image URL (e.g. picsum)
4. **Publish Now** → `DRAFT` → `PUBLISHING` → `PUBLISHED`
5. Photo on Polyedro Test Page feed

## Not done yet

- Instagram real publish (App Review)
- Cloudinary / production media storage
- Long-lived Page token refresh in n8n
- Production Postgres deploy
- Static ngrok domain or hosted API URL
