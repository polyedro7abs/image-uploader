#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 https://your-subdomain.ngrok-free.app" >&2
  exit 1
fi

URL="${1%/}"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/apps/server/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

if grep -q '^APP_PUBLIC_URL=' "$ENV_FILE"; then
  sed -i "s|^APP_PUBLIC_URL=.*|APP_PUBLIC_URL=$URL|" "$ENV_FILE"
else
  echo "APP_PUBLIC_URL=$URL" >> "$ENV_FILE"
fi

echo "Updated APP_PUBLIC_URL=$URL"
echo "n8n callback: $URL/webhooks/n8n-callback"
echo "Restart: pnpm --filter server dev"
