# Scheduled publishing & calendar

Branch **`direct-fb-publish`** adds time-based publishing on top of the
existing direct Meta publish loop. Manual **Publish Now** is unchanged —
scheduling only controls *when* `triggerPublishWorkflow` runs.

## Architecture

```
UI calendar (/dashboard/calendar)
  → POST /posts { scheduledAt }           → status SCHEDULED
  → PATCH /posts/:id/schedule             → reschedule or unschedule

Cron (apps/server/src/jobs/scheduler.ts)
  every 60s: status = SCHEDULED AND scheduledAt <= now
    → atomically set PUBLISHING (WHERE status = SCHEDULED)
    → triggerPublishWorkflow(post)        ← same function as Publish Now
    → PUBLISHED | FAILED
```

## API

| Endpoint | Behavior |
|----------|----------|
| `POST /posts` | Future `scheduledAt` → `SCHEDULED`; omitted/past → `DRAFT` |
| `PATCH /posts/:id/schedule` | `{ scheduledAt: "<ISO>" }` → reschedule; `{ scheduledAt: null }` → `DRAFT` |
| `POST /posts/:id/publish` | Unchanged — immediate publish for `DRAFT` or `SCHEDULED` |

Reschedule is rejected when status is `PUBLISHING`, `PUBLISHED`, or `FAILED`.

## Calendar UI

Route: `/dashboard/calendar`

- Month grid grouped by local day from `scheduledAt`
- Click a day → list posts + **Schedule Post**
- Hover **+** on a day → create form pre-filled with that date
- Click a post chip → reschedule / unschedule dialog
- Status badge colors: gray = draft, blue = scheduled/publishing, green = published, red = failed

Shared helpers: `apps/web/src/lib/api.ts`, `apps/web/src/lib/post-status.ts`,
`apps/web/src/lib/date-input.ts`.

## Smoke test (cron)

```bash
SCHEDULED_AT=$(node -e 'console.log(new Date(Date.now()+70000).toISOString())')

curl -sS -X POST http://localhost:3000/posts \
  -H 'content-type: application/json' \
  -d "{\"mediaUrl\":\"https://example.com/test.png\",\"caption\":\"Scheduler test\",\"platforms\":[\"INSTAGRAM\"],\"scheduledAt\":\"$SCHEDULED_AT\"}"
```

Wait ~90s. Server logs should show `Firing scheduled post`; status moves
`SCHEDULED` → `PUBLISHING` → `PUBLISHED` (or `FAILED` without FB creds).

## Known gaps

- `GET /posts` has no server-side filtering — calendar fetches all and filters client-side
- No delete endpoint for test posts
- No automated tests for the scheduler cron
