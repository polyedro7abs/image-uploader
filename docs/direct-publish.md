# Direct Meta publish (no n8n)

Branch **`direct-fb-publish`** removes the n8n hop. The server calls the
Meta Graph API directly and updates the post's status in the same request
cycle — no external orchestrator, no callback webhook, no tunnel.

## Architecture

```
UI (Next.js :3001)
  → API (Hono :3000) POST /posts/:id/publish
       → status = PUBLISHING
       → triggerPublishWorkflow (apps/server/src/lib/posts.ts)
            → Facebook platform → Meta Graph API POST /{page-id}/photos
            → other platforms   → mocked result
       → finalizePost → status = PUBLISHED | FAILED, platformResults
  → UI polls GET /posts every 3s
```

`triggerPublishWorkflow` is fire-and-forget from the route handler (same
as before), so the `PUBLISHING` → `PUBLISHED`/`FAILED` transition is still
async from the UI's point of view, but there is no network hop to a
third-party service in between — no webhook URL, no ngrok/Cloudflare
tunnel, no callback endpoint to secure.

## Env vars (`apps/server/.env`)

| Variable | Purpose |
|----------|---------|
| `FB_PAGE_ID` | Facebook Page ID (`GET /me/accounts` → `data[].id`) |
| `FB_PAGE_ACCESS_TOKEN` | Page access token from the same `/me/accounts` row |

`N8N_WEBHOOK_URL` and `APP_PUBLIC_URL` are gone — there's no webhook to
trigger and no callback URL to expose.

If `FB_PAGE_ID`/`FB_PAGE_ACCESS_TOKEN` are unset, publishing a post with
Facebook selected fails fast with a clear error message instead of
silently mocking (unlike the old empty-`N8N_WEBHOOK_URL` mock mode).
Non-Facebook platforms (Instagram, TikTok, LinkedIn) are always mocked
here, same as they were in the n8n false-branch, until their real APIs
are wired in.

## Verified Graph API call

```bash
curl -X POST "https://graph.facebook.com/v19.0/{page-id}/photos" \
  -F "url=https://picsum.photos/800/600" \
  -F "caption=Test post from Polyedro" \
  -F "access_token={FB_PAGE_ACCESS_TOKEN}"
```

Same call `pnpm --filter server test:fb-publish` exercises
(`apps/server/src/scripts/test-fb-publish.ts`) — kept as a standalone
smoke test independent of the publish loop.

## `mediaUrl` still needs to be public

Meta's servers fetch the image URL directly, so
`http://localhost:3000/uploads/...` will fail regardless of n8n. Use a
public HTTPS URL (e.g. `https://picsum.photos/800/600`) for local testing,
or expose `apps/server`'s `/uploads` path publicly if you need to test
real uploads end to end.

## E2E test checklist

1. `pnpm --filter server dev` + `pnpm --filter web dev`
2. Create a post at `/dashboard/posts` with **Facebook** checked and a
   public `mediaUrl`
3. **Publish Now** → UI shows `DRAFT` → `PUBLISHING` → `PUBLISHED`
4. Photo appears on the Facebook Page
