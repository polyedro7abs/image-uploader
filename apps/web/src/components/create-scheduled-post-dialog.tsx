"use client";

import { SocialPlatform, type SocialPlatform as SocialPlatformType } from "@Polyedro-abs/types";
import { Button } from "@Polyedro-abs/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@Polyedro-abs/ui/components/dialog";
import { Checkbox } from "@Polyedro-abs/ui/components/checkbox";
import { Input } from "@Polyedro-abs/ui/components/input";
import { Label } from "@Polyedro-abs/ui/components/label";
import { Textarea } from "@Polyedro-abs/ui/components/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createPost, uploadMedia } from "@/lib/api";
import { defaultScheduleTime, toDateInputValue, toTimeInputValue } from "@/lib/date-input";

const PLATFORMS = Object.values(SocialPlatform) as SocialPlatformType[];

interface CreateScheduledPostDialogProps {
  day: Date | null;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateScheduledPostDialog({
  day,
  open,
  onClose,
  onCreated,
}: CreateScheduledPostDialogProps) {
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatformType[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open || !day) return;

    const defaults = defaultScheduleTime(day);
    setDate(toDateInputValue(defaults));
    setTime(toTimeInputValue(defaults));
    setCaption("");
    setMediaUrl(null);
    setSelectedPlatforms([]);
  }, [open, day]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadMedia(file);
      setMediaUrl(url);
      toast.success("Media uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleCreate() {
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
    if (!date || !time) {
      toast.error("Pick a date and time");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      toast.error("Invalid date/time");
      return;
    }
    if (scheduledAt.getTime() <= Date.now()) {
      toast.error("Schedule time must be in the future");
      return;
    }

    setIsCreating(true);
    try {
      await createPost({
        mediaUrl,
        caption: caption.trim(),
        platforms: selectedPlatforms,
        scheduledAt: scheduledAt.toISOString(),
      });
      toast.success("Post scheduled");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule post");
    } finally {
      setIsCreating(false);
    }
  }

  const dayLabel = day?.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Post</DialogTitle>
          <DialogDescription>{dayLabel}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="schedule-media">Media</Label>
            <input
              id="schedule-media"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            {mediaUrl && (
              <p className="truncate text-xs text-muted-foreground">Uploaded: {mediaUrl}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="schedule-caption">Caption</Label>
            <Textarea
              id="schedule-caption"
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

          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="schedule-date">Date</Label>
              <Input
                id="schedule-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="schedule-time">Time</Label>
              <Input
                id="schedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating || isUploading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || isUploading}>
            {isCreating ? "Scheduling..." : "Schedule Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
