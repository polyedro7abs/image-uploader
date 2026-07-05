import cron, { type ScheduledTask } from "node-cron";
import { and, eq, lte } from "drizzle-orm";
import { PostStatus } from "@Polyedro-abs/types";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { triggerPublishWorkflow } from "@/lib/posts";

let scheduledPublishTask: ScheduledTask | null = null;

export async function fireDueScheduledPosts(): Promise<void> {
  const now = new Date();
  const duePosts = await db
    .select()
    .from(posts)
    .where(and(eq(posts.status, PostStatus.SCHEDULED), lte(posts.scheduledAt, now)));

  for (const post of duePosts) {
    try {
      const fireTime = new Date();
      const [claimed] = await db
        .update(posts)
        .set({
          status: PostStatus.PUBLISHING,
          errorMessage: null,
          platformResults: null,
          updatedAt: fireTime,
        })
        .where(and(eq(posts.id, post.id), eq(posts.status, PostStatus.SCHEDULED)))
        .returning();

      if (!claimed) {
        continue;
      }

      console.log("Firing scheduled post", {
        postId: claimed.id,
        scheduledAt: claimed.scheduledAt?.toISOString() ?? null,
        firedAt: fireTime.toISOString(),
      });

      await triggerPublishWorkflow(claimed);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown scheduler error";
      console.error(`Failed to fire scheduled post ${post.id}:`, errorMessage);
    }
  }
}

export function startScheduledPublishJob(): ScheduledTask {
  if (scheduledPublishTask) {
    return scheduledPublishTask;
  }

  scheduledPublishTask = cron.schedule("* * * * *", () => {
    void fireDueScheduledPosts();
  });

  console.log("Scheduled publish job started");
  return scheduledPublishTask;
}
