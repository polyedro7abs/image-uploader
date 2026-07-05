# n8n publish workflow (Polyedro Test Page)

Wire the existing webhook to Facebook Graph API and callback to the Polyedro API.

**Webhook URL:** `https://bramar.app.n8n.cloud/webhook/polyedro-publish-loop`

> **Webhook path:** `polyedro-publish-loop` (not `polyedro-publish`). Another workflow in the same n8n Cloud instance already uses `polyedro-publish`, so this path was renamed to avoid a conflict. Do not change it back to `polyedro-publish`.

## Prerequisites

### n8n Variables

In n8n Cloud → **Variables** panel (not server `.env`):

| Variable | Example | Used for |
|----------|---------|----------|
| `FB_PAGE_ID` | `123456789012345` | Graph API URL path (from `/me/accounts`) |
| `FB_PAGE_ACCESS_TOKEN` | *(Page token from `/me/accounts`)* | Facebook `access_token` field |
| `APP_PUBLIC_URL` | `https://xxxx.ngrok-free.dev` | Callback base URL (update each ngrok session) |

Never hardcode tokens in nodes — use `{{ $vars.FB_PAGE_ACCESS_TOKEN }}`.

> **Expression syntax:** n8n Cloud Variables use `$vars.KEY` in expressions, not `$env.KEY` — confirmed via the Variables panel's **Usage Syntax** column. This differs from self-hosted n8n's `process.env`-style access in Code nodes.

### App `.env` (server)

```env
N8N_WEBHOOK_URL=https://bramar.app.n8n.cloud/webhook/polyedro-publish-loop
APP_PUBLIC_URL=https://your-ngrok-url.ngrok-free.dev
FB_PAGE_ID=
```

Run locally:

```bash
pnpm --filter server dev    # :3000
pnpm --filter web dev       # :3001
ngrok http 3000             # copy HTTPS URL → APP_PUBLIC_URL + n8n Variables
```

### Important: public `mediaUrl`

Facebook and n8n Cloud must fetch the image URL. **`http://localhost:3000/uploads/...` will fail.**

For E2E tests use either:

- A public URL in the create form (e.g. `https://picsum.photos/800/600`), or
- ngrok exposing the API so `https://{ngrok}/uploads/{file}` is reachable

---

## Webhook payload (from app)

Flat JSON (not nested under `body`):

```json
{
  "postId": "uuid",
  "mediaUrl": "https://picsum.photos/800/600",
  "caption": "Hello",
  "platforms": ["facebook", "instagram"],
  "businessId": "123456789012345",
  "callbackUrl": "https://your-ngrok.ngrok-free.dev/webhooks/n8n-callback"
}
```

- `platforms` — lowercase slugs (`facebook`, `instagram`, `tiktok`, `linkedin`)
- `businessId` — Facebook Page ID from server `FB_PAGE_ID` (optional, null if unset)
- `callbackUrl` — use this in callback nodes, or build from `$vars.APP_PUBLIC_URL`

---

## Node graph

```
Webhook
  → IF (facebook in platforms?)
      ├─ TRUE  → HTTP Request (Facebook photos)
      │            ├─ success → HTTP Request (callback PUBLISHED)
      │            └─ error   → HTTP Request (callback FAILED)
      └─ FALSE → HTTP Request (callback PUBLISHED mock)
```

---

## Node 1 — Webhook (existing)

- **Method:** POST
- **Path:** `polyedro-publish-loop` (see note at top — not `polyedro-publish`)
- **Response:** Respond immediately (workflow continues async) or use **Respond to Webhook** at the end — for this flow, default “on received” is fine

---

## Node 2 — IF (Facebook selected?)

- **Condition:** Boolean
- **Value 1:**
  ```text
  {{ $json.platforms.includes('facebook') }}
  ```
- **Operation:** is true

---

## Node 3a — HTTP Request (Facebook publish) — TRUE branch

- **Method:** POST
- **URL:**
  ```text
  https://graph.facebook.com/v19.0/{{ $vars.FB_PAGE_ID }}/photos
  ```
- **Authentication:** None (token in body)
- **Send Body:** ON
- **Body Content Type:** Form-Data (Multipart)
- **Fields:**

  | Name | Value |
  |------|--------|
  | `url` | `{{ $json.mediaUrl }}` |
  | `caption` | `{{ $json.caption }}` |
  | `access_token` | `{{ $vars.FB_PAGE_ACCESS_TOKEN }}` |

- **Options → Response:** Full response
- **On Error:** Continue using **Error Output** (enable in node settings) — route error output to callback FAILED node

**Success response example:**

```json
{ "id": "122103345561380217", "post_id": "123456789012345_122103345609380217" }
```

---

## Node 4a — HTTP Request (callback success) — after Facebook success

- **Method:** POST
- **URL:**
  ```text
  {{ $json.callbackUrl }}
  ```
  Or fixed:
  ```text
  {{ $vars.APP_PUBLIC_URL }}/webhooks/n8n-callback
  ```
- **Body Content Type:** JSON
- **Body:**

```json
{
  "postId": "{{ $('Webhook').item.json.postId }}",
  "status": "PUBLISHED",
  "platformResults": {
    "facebook": "{{ $json.post_id || $json.id }}"
  }
}
```

Use the **Facebook HTTP Request** node name if not `HTTP Request`:

```json
"platformResults": {
  "facebook": "{{ $('Facebook Publish').item.json.post_id }}"
}
```

---

## Node 4b — HTTP Request (callback failed) — Facebook error output

Connect from Facebook node **error** branch (or add IF after Facebook checking `$json.error`).

- **Method:** POST
- **URL:** `{{ $('Webhook').item.json.callbackUrl }}`
- **JSON body:**

```json
{
  "postId": "{{ $('Webhook').item.json.postId }}",
  "status": "FAILED",
  "errorMessage": "{{ $json.error.message || $json.message || 'Facebook publish failed' }}"
}
```

If error comes from HTTP Request error output, message may be at `$json.error.message`.

---

## Node 3b — HTTP Request (mock publish) — FALSE branch

For Instagram-only / non-Facebook posts (Instagram real API skipped until App Review).

- **Method:** POST
- **URL:** `{{ $json.callbackUrl }}`
- **JSON body:**

```json
{
  "postId": "{{ $json.postId }}",
  "status": "PUBLISHED",
  "platformResults": {
    "instagram": "mock:app-review-pending",
    "tiktok": "mock:not-configured",
    "linkedin": "mock:not-configured"
  }
}
```

Only include keys for platforms in `{{ $json.platforms }}` if you prefer — or send a single mock note:

```json
{
  "postId": "{{ $json.postId }}",
  "status": "PUBLISHED",
  "platformResults": {
    "note": "Non-Facebook platforms mocked — real publish not configured"
  }
}
```

---

## Callback API contract

`POST /webhooks/n8n-callback`

```json
{
  "postId": "uuid",
  "status": "PUBLISHED" | "FAILED",
  "errorMessage": "optional when FAILED",
  "platformResults": { "facebook": "123456789012345_122103345609380217" }
}
```

Post must be in `PUBLISHING` status.

---

## E2E test checklist

1. ngrok running → `APP_PUBLIC_URL` set in server `.env` and n8n Variables
2. n8n workflow **active**
3. Create post at `http://localhost:3001/dashboard/posts`
   - Caption: anything
   - **Facebook** checked
   - Media URL: `https://picsum.photos/800/600` (public)
4. **Publish Now**
5. UI: `DRAFT` → `PUBLISHING` → `PUBLISHED` (polls every 3s)
6. Verify photo on **Polyedro Test Page** Facebook feed

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Stuck on `PUBLISHING` | ngrok down, wrong `APP_PUBLIC_URL`, or callback node URL wrong |
| Facebook `(#200) timelines` | Wrong token — use Page token from `/me/accounts` |
| Facebook can't fetch `url` | Use public HTTPS image, not localhost |
| IF never true | Platforms are lowercase in payload — use `'facebook'` not `'FACEBOOK'` |
