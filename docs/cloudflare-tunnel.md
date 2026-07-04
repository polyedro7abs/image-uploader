# Cloudflare Tunnel (polyedro-dev)

Local API is exposed through Cloudflare Tunnel **`polyedro-dev`** (`0faf7ea2-4782-4f5a-8967-2ba8fd26ebdc`).

## Public URL

Set in `apps/server/.env`:

```bash
APP_PUBLIC_URL=https://api-polyedro-dev.braker.dev.infraone.space
```

DNS was provisioned with:

```bash
cloudflared tunnel route dns polyedro-dev api-polyedro-dev.braker.dev
```

Cloudflare created the hostname **`api-polyedro-dev.braker.dev.infraone.space`** (zone managed on your account).

## Config

`~/.cloudflared/config.yml` routes that hostname to the server on port 3000.

## Run the tunnel

1. Start the API locally (port **3000**), e.g. from the repo root:

   ```bash
   pnpm --filter server dev
   ```

2. In another terminal (use `--protocol http2` if QUIC fails):

   ```bash
   cloudflared tunnel --protocol http2 run polyedro-dev
   ```

   Or run by config (uses `~/.cloudflared/config.yml`):

   ```bash
   cloudflared tunnel --protocol http2 run
   ```

3. Optional: install as a system service:

   ```bash
   cloudflared service install
   sudo systemctl enable --now cloudflared
   ```

## n8n webhook callback

In your n8n workflow, set the **HTTP Request** node URL to:

```text
{APP_PUBLIC_URL}/webhooks/n8n-callback
```

With the current `APP_PUBLIC_URL`:

```text
https://api-polyedro-dev.braker.dev.infraone.space/webhooks/n8n-callback
```

The tunnel must be running and the server listening on `localhost:3000` when n8n calls this URL.

## Troubleshooting: tunnel won't connect

If you see precheck failures like:

```text
UDP Connectivity  region1.v2.argotunnel.com  FAIL    QUIC connection failed
TCP Connectivity  region1.v2.argotunnel.com  FAIL    HTTP/2 connection is blocked or unreachable
ERROR: Allow outbound QUIC traffic on port 7844 or use HTTP2.
ERROR: Allow outbound TCP on port 7844.
```

Your network is **blocking outbound port 7844** to Cloudflare (common on corporate Wi‑Fi, university networks, or some container/VM environments).

**Try first:** force HTTP/2:

```bash
cloudflared tunnel --protocol http2 run polyedro-dev
```

**If TCP 7844 is also blocked** (test with `nc -zv 198.41.192.107 7844`), Cloudflare Tunnel cannot work from that network. Options:

1. **Different network** — home Wi‑Fi, phone hotspot, or run `cloudflared` on your host machine (not inside a restricted container).
2. **Allow firewall egress** — outbound TCP **and** UDP to port **7844** on [Cloudflare tunnel IPs](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/).
3. **ngrok fallback** (uses HTTPS/443, usually works):

   ```bash
   ngrok http 3000
   ```

   Set `APP_PUBLIC_URL` to the ngrok URL (e.g. `https://abc123.ngrok-free.app`) and point n8n's HTTP Request node at `{APP_PUBLIC_URL}/webhooks/n8n-callback`.

4. **Local mock mode** (no tunnel, no n8n callback) — in `apps/server/.env`:

   ```env
   N8N_WEBHOOK_URL=
   ```

   Publish resolves after ~2s with random success/failure for UI testing.

## Notes

- Credentials: `~/.cloudflared/0faf7ea2-4782-4f5a-8967-2ba8fd26ebdc.json` (do not commit).
- To use a different hostname under another zone, run `cloudflared tunnel route dns polyedro-dev <hostname>` and update `ingress` in `~/.cloudflared/config.yml` and `APP_PUBLIC_URL` to match.
