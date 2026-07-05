import { env } from "@Polyedro-abs/env/web";
import type { CreatePostInput, Post } from "@Polyedro-abs/types";

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

async function parseError(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  throw new Error(body?.error ?? fallback);
}

export async function getPosts(): Promise<Post[]> {
  const res = await fetch(`${SERVER_URL}/posts`);
  if (!res.ok) {
    throw new Error("Failed to fetch posts");
  }
  return (await res.json()) as Post[];
}

export async function uploadMedia(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${SERVER_URL}/media/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    await parseError(res, "Upload failed");
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const res = await fetch(`${SERVER_URL}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    await parseError(res, "Failed to create post");
  }
  return (await res.json()) as Post;
}

export async function reschedulePost(id: string, scheduledAt: string | null): Promise<Post> {
  const res = await fetch(`${SERVER_URL}/posts/${id}/schedule`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduledAt }),
  });
  if (!res.ok) {
    await parseError(res, "Failed to reschedule post");
  }
  return (await res.json()) as Post;
}
