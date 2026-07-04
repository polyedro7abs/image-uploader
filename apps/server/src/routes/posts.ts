import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  createPostSchema,
  n8nCallbackSchema,
  PostStatus,
  updatePostSchema,
} from "@Polyedro-abs/types";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { finalizePost, serializePlatforms, toPost, triggerPublishWorkflow } from "@/lib/posts";

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

postsRoutes.post("/", async (c) => {
  const parsed = createPostSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { mediaUrl, caption, platforms, scheduledAt } = parsed.data;
  const status = scheduledAt ? PostStatus.SCHEDULED : PostStatus.DRAFT;

  const [created] = await db
    .insert(posts)
    .values({
      mediaUrl,
      caption,
      platforms: serializePlatforms(platforms),
      status,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    })
    .returning();

  return c.json(toPost(created!), 201);
});

postsRoutes.get("/", async (c) => {
  const rows = await db.select().from(posts).orderBy(desc(posts.createdAt));
  return c.json(rows.map(toPost));
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
      ? nextScheduledAt
        ? PostStatus.SCHEDULED
        : PostStatus.DRAFT
      : existing.status;

  const [updated] = await db
    .update(posts)
    .set({
      ...(mediaUrl !== undefined && { mediaUrl }),
      ...(caption !== undefined && { caption }),
      ...(platforms !== undefined && { platforms: serializePlatforms(platforms) }),
      scheduledAt: nextScheduledAt,
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
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning();

  void triggerPublishWorkflow(updated!);

  return c.json(toPost(updated!));
});

export const webhookRoutes = new Hono();

webhookRoutes.post("/n8n-callback", async (c) => {
  const parsed = n8nCallbackSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { postId, status, errorMessage } = parsed.data;
  const [existing] = await db.select().from(posts).where(eq(posts.id, postId));

  if (!existing) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (existing.status !== PostStatus.PUBLISHING) {
    return c.json({ error: "Post is not in publishing state" }, 400);
  }

  const updated = await finalizePost(postId, status, errorMessage);
  return c.json(updated);
});
