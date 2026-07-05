"use client";

import { PostStatus, type Post } from "@Polyedro-abs/types";
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
import { Input } from "@Polyedro-abs/ui/components/input";
import { Label } from "@Polyedro-abs/ui/components/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { reschedulePost } from "@/lib/api";
import { toDateInputValue, toTimeInputValue } from "@/lib/date-input";
import { statusBadgeClass } from "@/lib/post-status";

interface ReschedulePostDialogProps {
  post: Post | null;
  onClose: () => void;
  onRescheduled: () => void;
}

export function ReschedulePostDialog({ post, onClose, onRescheduled }: ReschedulePostDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUnscheduling, setIsUnscheduling] = useState(false);

  useEffect(() => {
    if (post?.scheduledAt) {
      const parsed = new Date(post.scheduledAt);
      setDate(toDateInputValue(parsed));
      setTime(toTimeInputValue(parsed));
    }
  }, [post]);

  const isEditable = post?.status === PostStatus.SCHEDULED;

  async function handleSave() {
    if (!post || !date || !time) {
      toast.error("Pick a date and time");
      return;
    }
    const localDateTime = new Date(`${date}T${time}`);
    if (Number.isNaN(localDateTime.getTime())) {
      toast.error("Invalid date/time");
      return;
    }

    setIsSaving(true);
    try {
      await reschedulePost(post.id, localDateTime.toISOString());
      toast.success("Post rescheduled");
      onRescheduled();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reschedule post");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnschedule() {
    if (!post) return;

    setIsUnscheduling(true);
    try {
      await reschedulePost(post.id, null);
      toast.success("Post unscheduled");
      onRescheduled();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unschedule post");
    } finally {
      setIsUnscheduling(false);
    }
  }

  return (
    <Dialog open={post !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {post && (
          <>
            <DialogHeader>
              <DialogTitle className="truncate">{post.caption}</DialogTitle>
              <DialogDescription>{post.platforms.join(", ")}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div>
                <Badge className={statusBadgeClass(post.status)}>{post.status}</Badge>
                {post.errorMessage && (
                  <p className="mt-1 text-xs text-destructive">{post.errorMessage}</p>
                )}
              </div>

              {isEditable ? (
                <div className="flex gap-2">
                  <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor="reschedule-date">Date</Label>
                    <Input
                      id="reschedule-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor="reschedule-time">Time</Label>
                    <Input
                      id="reschedule-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                post.scheduledAt && (
                  <p className="text-xs text-muted-foreground">
                    Scheduled for {new Date(post.scheduledAt).toLocaleString()}
                  </p>
                )
              )}
            </div>

            {isEditable && (
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={handleUnschedule}
                  disabled={isSaving || isUnscheduling}
                >
                  {isUnscheduling ? "Unscheduling..." : "Unschedule"}
                </Button>
                <Button onClick={handleSave} disabled={isSaving || isUnscheduling}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
