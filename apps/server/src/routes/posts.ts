import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  createPostSchema,
  PostStatus,
  schedulePostSchema,
  updatePostSchema,
} from "@Polyedro-abs/types";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { serializePlatforms, toPost, triggerPublishWorkflow } from "@/lib/posts";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export const mediaRoutes = new Hono();

mediaRoutes.post("/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;

  if (!(file instanceof File)) {
    return c.json({ error: "file is required" }, 400);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const filename = `${randomUUID()}${ext}`;
  const filepath = join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filepath, buffer);

  const url = `${new URL(c.req.url).origin}/uploads/${filename}`;
  return c.json({ url });
});

export const postsRoutes = new Hono();

function scheduledDateFrom(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function isFutureDate(date: Date | null): date is Date {
  return date !== null && date.getTime() > Date.now();
}

postsRoutes.post("/", async (c) => {
  const parsed = createPostSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { mediaUrl, caption, platforms, scheduledAt } = parsed.data;
  const scheduledDate = scheduledDateFrom(scheduledAt);
  const isScheduled = isFutureDate(scheduledDate);

  const [created] = await db
    .insert(posts)
    .values({
      mediaUrl,
      caption,
      platforms: serializePlatforms(platforms),
      status: isScheduled ? PostStatus.SCHEDULED : PostStatus.DRAFT,
      scheduledAt: isScheduled ? scheduledDate : null,
    })
    .returning();

  return c.json(toPost(created!), 201);
});

postsRoutes.get("/", async (c) => {
  const rows = await db.select().from(posts).orderBy(desc(posts.createdAt));
  return c.json(rows.map(toPost));
});

postsRoutes.patch("/:id/schedule", async (c) => {
  const id = c.req.param("id");
  const parsed = schedulePostSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const [existing] = await db.select().from(posts).where(eq(posts.id, id));
  if (!existing) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (
    existing.status === PostStatus.PUBLISHING ||
    existing.status === PostStatus.PUBLISHED ||
    existing.status === PostStatus.FAILED
  ) {
    return c.json({ error: `Cannot reschedule a post with status ${existing.status}` }, 400);
  }

  const { scheduledAt } = parsed.data;
  if (scheduledAt === undefined) {
    return c.json({ error: "scheduledAt is required; pass an ISO date string or null" }, 400);
  }

  const nextScheduledAt = scheduledDateFrom(scheduledAt);
  if (scheduledAt !== null && !isFutureDate(nextScheduledAt)) {
    return c.json({ error: "scheduledAt must be a future ISO date string" }, 400);
  }

  const [updated] = await db
    .update(posts)
    .set({
      scheduledAt: nextScheduledAt,
      status: nextScheduledAt ? PostStatus.SCHEDULED : PostStatus.DRAFT,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning();

  return c.json(toPost(updated!));
});

postsRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = updatePostSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const [existing] = await db.select().from(posts).where(eq(posts.id, id));
  if (!existing) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (existing.status !== PostStatus.DRAFT && existing.status !== PostStatus.SCHEDULED) {
    return c.json({ error: "Only draft or scheduled posts can be updated" }, 400);
  }

  const { mediaUrl, caption, platforms, scheduledAt } = parsed.data;
  const nextScheduledAt =
    scheduledAt === undefined
      ? existing.scheduledAt
      : scheduledAt === null
        ? null
        : new Date(scheduledAt);

  const nextStatus =
    scheduledAt !== undefined
      ? isFutureDate(nextScheduledAt)
        ? PostStatus.SCHEDULED
        : PostStatus.DRAFT
      : existing.status;

  const [updated] = await db
    .update(posts)
    .set({
      ...(mediaUrl !== undefined && { mediaUrl }),
      ...(caption !== undefined && { caption }),
      ...(platforms !== undefined && { platforms: serializePlatforms(platforms) }),
      scheduledAt: nextStatus === PostStatus.SCHEDULED ? nextScheduledAt : null,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning();

  return c.json(toPost(updated!));
});

postsRoutes.post("/:id/publish", async (c) => {
  const id = c.req.param("id");
  const [existing] = await db.select().from(posts).where(eq(posts.id, id));

  if (!existing) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (existing.status !== PostStatus.DRAFT && existing.status !== PostStatus.SCHEDULED) {
    return c.json({ error: "Only draft or scheduled posts can be published" }, 400);
  }

  const [updated] = await db
    .update(posts)
    .set({
      status: PostStatus.PUBLISHING,
      errorMessage: null,
      platformResults: null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning();

  void triggerPublishWorkflow(updated!);

  return c.json(toPost(updated!));
});
