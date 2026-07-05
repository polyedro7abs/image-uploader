/**
 * One-off Facebook Page photo publish verification.
 *
 * Run from apps/server (loads .env via dotenv):
 *   pnpm test:fb-publish
 *
 * Required env: FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN
 *
 * This is the same Graph API call apps/server/src/lib/posts.ts makes
 * directly for real publishes — see docs/direct-publish.md.
 *
 * curl equivalent:
 *   curl -X POST "https://graph.facebook.com/v19.0/{page-id}/photos" \
 *     -F "url=https://picsum.photos/800/600" \
 *     -F "caption=Test post from Polyedro" \
 *     -F "access_token={FB_PAGE_ACCESS_TOKEN}"
 */

import "dotenv/config";

const GRAPH_VERSION = "v19.0";
const TEST_IMAGE_URL = "https://picsum.photos/800/600";
const TEST_CAPTION = "Test post from Polyedro";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Add it to apps/server/.env (see .env.example).`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const pageId = requireEnv("FB_PAGE_ID");
  const accessToken = requireEnv("FB_PAGE_ACCESS_TOKEN");

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`;

  const body = new FormData();
  body.append("url", TEST_IMAGE_URL);
  body.append("caption", TEST_CAPTION);
  body.append("access_token", accessToken);

  console.log(`POST ${url}`);
  console.log(`  url=${TEST_IMAGE_URL}`);
  console.log(`  caption=${TEST_CAPTION}`);
  console.log(`  access_token=*** (${accessToken.length} chars)\n`);

  const response = await fetch(url, { method: "POST", body });
  const data: unknown = await response.json();

  if (!response.ok) {
    console.error("Facebook API error:");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const result = data as { id?: string; post_id?: string };
  const postId = result.post_id ?? result.id;

  console.log("Success:");
  console.log(JSON.stringify(data, null, 2));
  if (postId) {
    console.log(`\npost_id: ${postId}`);
  }
}

main().catch((err: unknown) => {
  console.error("Request failed:", err);
  process.exit(1);
});
