"use client";

import type { Post } from "@Polyedro-abs/types";
import { Badge } from "@Polyedro-abs/ui/components/badge";
import { Button } from "@Polyedro-abs/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@Polyedro-abs/ui/components/dialog";
import { Plus } from "lucide-react";
import { statusBadgeClass } from "@/lib/post-status";

interface DayPostsDialogProps {
  day: Date | null;
  posts: Post[];
  onClose: () => void;
  onPostClick: (post: Post) => void;
  onScheduleClick: () => void;
}

export function DayPostsDialog({
  day,
  posts,
  onClose,
  onPostClick,
  onScheduleClick,
}: DayPostsDialogProps) {
  const dayLabel = day?.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const sortedPosts = [...posts].sort((a, b) => {
    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    return aTime - bTime;
  });

  return (
    <Dialog open={day !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dayLabel}</DialogTitle>
          <DialogDescription>
            {posts.length === 0
              ? "No posts scheduled for this day."
              : `${posts.length} post${posts.length === 1 ? "" : "s"} scheduled`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {sortedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Schedule a post to publish on this day.
            </p>
          ) : (
            sortedPosts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => onPostClick(post)}
                className="flex flex-col gap-1 rounded-md border border-border p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-sm font-medium">{post.caption}</span>
                  <Badge className={`shrink-0 ${statusBadgeClass(post.status)}`}>
                    {post.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{post.platforms.join(", ")}</span>
                  {post.scheduledAt && (
                    <span>{new Date(post.scheduledAt).toLocaleTimeString()}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button onClick={onScheduleClick}>
            <Plus />
            Schedule Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
