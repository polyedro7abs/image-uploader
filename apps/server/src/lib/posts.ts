import { env } from "@Polyedro-abs/env/server";
import {
  PostStatus,
  type Post,
  type SocialPlatform,
} from "@Polyedro-abs/types";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";

type DbPost = typeof posts.$inferSelect;

function parsePlatforms(raw: string): SocialPlatform[] {
  return JSON.parse(raw) as SocialPlatform[];
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
): Promise<Post | null> {
  const [updated] = await db
    .update(posts)
    .set({
      status,
      errorMessage: status === PostStatus.FAILED ? (errorMessage ?? "Publish failed") : null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId))
    .returning();

  return updated ? toPost(updated) : null;
}

export async function triggerPublishWorkflow(post: DbPost): Promise<void> {
  const payload = {
    postId: post.id,
    mediaUrl: post.mediaUrl,
    caption: post.caption,
    platforms: parsePlatforms(post.platforms),
    callbackUrl: `${env.APP_PUBLIC_URL ?? "http://localhost:3000"}/webhooks/n8n-callback`,
  };

  if (env.N8N_WEBHOOK_URL) {
    fetch(env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error("Failed to trigger n8n webhook:", err);
    });
    return;
  }

  setTimeout(() => {
    const success = Math.random() < 0.8;
    void finalizePost(
      post.id,
      success ? PostStatus.PUBLISHED : PostStatus.FAILED,
      success ? undefined : "Mock publish failed (simulated n8n error)",
    );
  }, 2000);
}
