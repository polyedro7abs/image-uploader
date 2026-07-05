import { z } from "zod";

export const PostStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  PUBLISHING: "PUBLISHING",
  PUBLISHED: "PUBLISHED",
  FAILED: "FAILED",
} as const;

export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus];

export const SocialPlatform = {
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  LINKEDIN: "LINKEDIN",
} as const;

export type SocialPlatform = (typeof SocialPlatform)[keyof typeof SocialPlatform];

const platformSchema = z.enum([
  SocialPlatform.FACEBOOK,
  SocialPlatform.INSTAGRAM,
  SocialPlatform.TIKTOK,
  SocialPlatform.LINKEDIN,
]);

const optionalScheduledAtSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.iso.datetime().optional(),
);

const nullableScheduledAtSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.iso.datetime().nullable().optional(),
);

export const createPostSchema = z.object({
  mediaUrl: z.url(),
  caption: z.string().min(1),
  platforms: z.array(platformSchema).min(1),
  scheduledAt: optionalScheduledAtSchema,
});

export const updatePostSchema = z.object({
  mediaUrl: z.url().optional(),
  caption: z.string().min(1).optional(),
  platforms: z.array(platformSchema).min(1).optional(),
  scheduledAt: nullableScheduledAtSchema,
});

export const schedulePostSchema = z.object({
  scheduledAt: nullableScheduledAtSchema,
});

export type Post = {
  id: string;
  mediaUrl: string;
  caption: string;
  platforms: SocialPlatform[];
  status: PostStatus;
  scheduledAt?: string | null;
  errorMessage: string | null;
  platformResults: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
