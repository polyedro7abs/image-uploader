# ngrok tunnel (dev callback URL)

Use ngrok when Cloudflare Tunnel port **7844** is blocked but HTTPS **443** works (common on corporate/VPN/VM networks).

## One-time setup

1. Install ngrok (already in `~/.local/bin/ngrok` if installed via project setup).

2. Sign up at [ngrok dashboard](https://dashboard.ngrok.com/signup).

3. Copy your authtoken from [get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken):

   ```bash
   ngrok config add-authtoken YOUR_TOKEN
   ```

## Each dev session

**Terminal 1 — API**

```bash
source ~/.bashrc
cd /home/braker/Polyedro-ads
pnpm --filter server dev
```

**Terminal 2 — ngrok**

```bash
ngrok http 3000
```

Copy the **Forwarding** HTTPS URL, e.g. `https://a1b2c3d4.ngrok-free.app`.

**Update `apps/server/.env`:**

```env
APP_PUBLIC_URL=https://a1b2c3d4.ngrok-free.app
```

Restart the server (Terminal 1) so it picks up the new URL.

**n8n HTTP Request node callback URL:**

```text
https://a1b2c3d4.ngrok-free.app/webhooks/n8n-callback
```

Body (JSON):

```json
{
  "postId": "{{ $json.body.postId }}",
  "status": "PUBLISHED"
}
```

## Verify callback

```bash
curl -X POST https://YOUR-NGROK-URL.ngrok-free.app/webhooks/n8n-callback \
  -H "Content-Type: application/json" \
  -d '{"postId":"<uuid-from-create-post>","status":"PUBLISHED"}'
```

## Notes

- **Free ngrok URLs change every restart** — update `APP_PUBLIC_URL` and the n8n node each session.
- Paid ngrok plans offer static domains if you use this daily.
- `callbackUrl` is also sent in the publish payload to n8n (`body.callbackUrl`) if your workflow reads it dynamically.
