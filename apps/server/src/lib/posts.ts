import { randomUUID } from "node:crypto";
import { env } from "@Polyedro-abs/env/server";
import { PostStatus, SocialPlatform, type Post } from "@Polyedro-abs/types";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";

type DbPost = typeof posts.$inferSelect;

function parsePlatforms(raw: string): SocialPlatform[] {
  return JSON.parse(raw) as SocialPlatform[];
}

function parsePlatformResults(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  return JSON.parse(raw) as Record<string, string>;
}

export function toPost(row: DbPost): Post {
  return {
    id: row.id,
    mediaUrl: row.mediaUrl,
    caption: row.caption,
    platforms: parsePlatforms(row.platforms),
    status: row.status as PostStatus,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    errorMessage: row.errorMessage,
    platformResults: parsePlatformResults(row.platformResults),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializePlatforms(platforms: SocialPlatform[]): string {
  return JSON.stringify(platforms);
}

export async function finalizePost(
  postId: string,
  status: typeof PostStatus.PUBLISHED | typeof PostStatus.FAILED,
  errorMessage?: string,
  platformResults?: Record<string, string>,
): Promise<Post | null> {
  const [updated] = await db
    .update(posts)
    .set({
      status,
      errorMessage: status === PostStatus.FAILED ? (errorMessage ?? "Publish failed") : null,
      platformResults:
        status === PostStatus.PUBLISHED && platformResults
          ? JSON.stringify(platformResults)
          : null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId))
    .returning();

  return updated ? toPost(updated) : null;
}

const GRAPH_VERSION = "v19.0";

async function publishToFacebook(post: DbPost): Promise<string> {
  if (!env.FB_PAGE_ID || !env.FB_PAGE_ACCESS_TOKEN) {
    throw new Error("FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN is not configured");
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${env.FB_PAGE_ID}/photos`;
  const body = new FormData();
  body.append("url", post.mediaUrl);
  body.append("caption", post.caption);
  body.append("access_token", env.FB_PAGE_ACCESS_TOKEN);

  const response = await fetch(url, { method: "POST", body });
  const data = (await response.json()) as { id?: string; post_id?: string; error?: { message: string } };

  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? `Facebook API responded with ${response.status}`);
  }

  const externalId = data.post_id ?? data.id;
  if (!externalId) {
    throw new Error("Facebook API response did not include a post id");
  }

  return externalId;
}

async function mockPublish(platform: SocialPlatform): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return `mock:${platform.toLowerCase()}:${randomUUID()}`;
}

export async function triggerPublishWorkflow(post: DbPost): Promise<void> {
  const platforms = parsePlatforms(post.platforms);
  const platformResults: Record<string, string> = {};

  try {
    for (const platform of platforms) {
      platformResults[platform.toLowerCase()] =
        platform === SocialPlatform.FACEBOOK
          ? await publishToFacebook(post)
          : await mockPublish(platform);
    }

    await finalizePost(post.id, PostStatus.PUBLISHED, undefined, platformResults);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Publish failed";
    console.error(`Failed to publish post ${post.id}:`, errorMessage);
    await finalizePost(post.id, PostStatus.FAILED, errorMessage);
  }
}
