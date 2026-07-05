"use client";

import {
  PostStatus,
  SocialPlatform,
  type Post,
  type SocialPlatform as SocialPlatformType,
} from "@Polyedro-abs/types";
import { Badge } from "@Polyedro-abs/ui/components/badge";
import { Button } from "@Polyedro-abs/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@Polyedro-abs/ui/components/card";
import { Checkbox } from "@Polyedro-abs/ui/components/checkbox";
import { Label } from "@Polyedro-abs/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@Polyedro-abs/ui/components/table";
import { Textarea } from "@Polyedro-abs/ui/components/textarea";
import { env } from "@Polyedro-abs/env/web";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const SERVER_URL = env.NEXT_PUBLIC_SERVER_URL;

const PLATFORMS = Object.values(SocialPlatform) as SocialPlatformType[];

const PLATFORM_VIEW_LABELS: Record<string, string> = {
  facebook: "View on Facebook",
  instagram: "View on Instagram",
  tiktok: "View on TikTok",
  linkedin: "View on LinkedIn",
};

function platformViewUrl(platform: string, externalId: string): string | null {
  if (externalId.startsWith("mock:")) return null;

  const normalized = platform.toLowerCase();
  switch (normalized) {
    case "facebook":
      return `https://www.facebook.com/${externalId}`;
    case "instagram":
      return `https://www.instagram.com/p/${externalId}`;
    case "tiktok":
      return `https://www.tiktok.com/@/video/${externalId}`;
    case "linkedin":
      return `https://www.linkedin.com/feed/update/${externalId}`;
    default:
      return null;
  }
}

function statusBadgeClass(status: Post["status"]): string {
  switch (status) {
    case PostStatus.DRAFT:
      return "bg-muted text-muted-foreground";
    case PostStatus.SCHEDULED:
      return "bg-muted text-muted-foreground";
    case PostStatus.PUBLISHING:
      return "bg-blue-500 text-white dark:bg-blue-600";
    case PostStatus.PUBLISHED:
      return "bg-green-500 text-white dark:bg-green-600";
    case PostStatus.FAILED:
      return "bg-destructive text-white";
    default:
      return "";
  }
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatformType[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/posts`);
      if (!res.ok) return;
      const data = (await res.json()) as Post[];
      setPosts(data);
    } catch {
      // Server may be offline during initial load
    }
  }, []);

  useEffect(() => {
    void fetchPosts();
    const interval = setInterval(() => {
      void fetchPosts();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${SERVER_URL}/media/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        toast.error("Upload failed");
        return;
      }

      const data = (await res.json()) as { url: string };
      setMediaUrl(data.url);
      toast.success("Media uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleCreatePost() {
    if (!mediaUrl) {
      toast.error("Upload media first");
      return;
    }
    if (!caption.trim()) {
      toast.error("Caption is required");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch(`${SERVER_URL}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaUrl,
          caption: caption.trim(),
          platforms: selectedPlatforms,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to create post");
        return;
      }

      toast.success("Post created");
      setCaption("");
      setMediaUrl(null);
      setSelectedPlatforms([]);
      void fetchPosts();
    } catch {
      toast.error("Failed to create post");
    } finally {
      setIsCreating(false);
    }
  }

  async function handlePublish(postId: string) {
    setPublishingId(postId);
    try {
      const res = await fetch(`${SERVER_URL}/posts/${postId}/publish`, {
        method: "POST",
      });

      if (!res.ok) {
        toast.error("Failed to publish");
        return;
      }

      toast.success("Publishing started");
      void fetchPosts();
    } catch {
      toast.error("Failed to publish");
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className="container mx-auto flex flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Post</CardTitle>
          <CardDescription>Upload media, write a caption, and select platforms.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="media">Media</Label>
            <input
              id="media"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {mediaUrl && (
              <p className="text-xs text-muted-foreground truncate">Uploaded: {mediaUrl}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              placeholder="Write your caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Platforms</Label>
            <div className="flex flex-wrap gap-4">
              {PLATFORMS.map((platform) => (
                <label key={platform} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedPlatforms.includes(platform)}
                    onCheckedChange={(checked) => {
                      setSelectedPlatforms((prev) =>
                        checked ? [...prev, platform] : prev.filter((p) => p !== platform),
                      );
                    }}
                  />
                  <span className="text-sm">{platform}</span>
                </label>
              ))}
            </div>
          </div>

          <Button onClick={handleCreatePost} disabled={isCreating || isUploading}>
            {isCreating ? "Creating..." : "Create Post"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posts</CardTitle>
          <CardDescription>Auto-refreshes every 3 seconds.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caption</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No posts yet
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-[200px] truncate">{post.caption}</TableCell>
                    <TableCell>{post.platforms.join(", ")}</TableCell>
                    <TableCell className="min-w-[12rem] max-w-md align-top select-text">
                      <Badge className={statusBadgeClass(post.status)}>{post.status}</Badge>
                      {post.errorMessage && (
                        <p className="mt-1 break-words text-xs text-destructive">
                          {post.errorMessage}
                        </p>
                      )}
                      {post.status === PostStatus.PUBLISHED && post.platformResults && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(post.platformResults).map(([platform, externalId]) => {
                            const url = platformViewUrl(platform, externalId);
                            const label =
                              PLATFORM_VIEW_LABELS[platform.toLowerCase()] ??
                              `View on ${platform}`;

                            if (url) {
                              return (
                                <a
                                  key={platform}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium text-primary hover:underline"
                                >
                                  {label}
                                </a>
                              );
                            }

                            return (
                              <Badge key={platform} variant="outline" className="text-xs">
                                {platform}: {externalId}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{new Date(post.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      {post.status === PostStatus.DRAFT && (
                        <Button
                          size="sm"
                          onClick={() => handlePublish(post.id)}
                          disabled={publishingId === post.id}
                        >
                          {publishingId === post.id ? "Publishing..." : "Publish Now"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
