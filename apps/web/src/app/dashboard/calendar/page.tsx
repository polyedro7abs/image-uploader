"use client";

import type { Post } from "@Polyedro-abs/types";
import { Button } from "@Polyedro-abs/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@Polyedro-abs/ui/components/card";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPosts } from "@/lib/api";
import { statusBadgeClass } from "@/lib/post-status";
import { CreateScheduledPostDialog } from "@/components/create-scheduled-post-dialog";
import { DayPostsDialog } from "@/components/day-posts-dialog";
import { ReschedulePostDialog } from "@/components/reschedule-post-dialog";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_DAY = 3;

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthGridDays(monthStart: Date): Date[] {
  const startOffset = monthStart.getDay();
  const gridStart = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    1 - startOffset,
  );

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export default function CalendarPage() {
  const [viewedMonth, setViewedMonth] = useState(() => startOfMonth(new Date()));
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await getPosts();
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

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      if (!post.scheduledAt) continue;
      const key = dayKey(new Date(post.scheduledAt));
      const existing = map.get(key);
      if (existing) {
        existing.push(post);
      } else {
        map.set(key, [post]);
      }
    }
    return map;
  }, [posts]);

  const gridDays = useMemo(() => getMonthGridDays(viewedMonth), [viewedMonth]);
  const today = dayKey(new Date());
  const monthLabel = viewedMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const selectedDayPosts = selectedDay ? (postsByDay.get(dayKey(selectedDay)) ?? []) : [];

  function goToPreviousMonth() {
    setViewedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setViewedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function openDay(day: Date) {
    setSelectedDay(day);
    setShowCreateDialog(false);
  }

  function openCreateForDay(day: Date) {
    setSelectedDay(day);
    setShowCreateDialog(true);
  }

  function handlePostClick(post: Post) {
    setSelectedDay(null);
    setSelectedPost(post);
  }

  return (
    <div className="container mx-auto flex flex-col gap-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{monthLabel}</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={goToPreviousMonth}>
              <ChevronLeft />
              <span className="sr-only">Previous month</span>
            </Button>
            <Button variant="outline" size="icon-sm" onClick={goToNextMonth}>
              <ChevronRight />
              <span className="sr-only">Next month</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px border border-border bg-border text-xs">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="bg-muted px-2 py-1 text-center font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
            {gridDays.map((day) => {
              const key = dayKey(day);
              const isCurrentMonth = day.getMonth() === viewedMonth.getMonth();
              const isToday = key === today;
              const dayPosts = postsByDay.get(key) ?? [];
              const visiblePosts = dayPosts.slice(0, MAX_CHIPS_PER_DAY);
              const overflowCount = dayPosts.length - visiblePosts.length;

              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDay(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDay(day);
                    }
                  }}
                  className={`group relative flex min-h-24 cursor-pointer flex-col gap-1 bg-background p-1.5 transition-colors hover:bg-muted/40 ${
                    isCurrentMonth ? "" : "opacity-40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs ${
                        isToday
                          ? "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-5 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateForDay(day);
                      }}
                      title="Schedule post"
                    >
                      <Plus className="size-3" />
                      <span className="sr-only">Schedule post</span>
                    </Button>
                  </div>
                  <div className="flex flex-col gap-1">
                    {visiblePosts.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePostClick(post);
                        }}
                        className={`truncate rounded-none px-1.5 py-0.5 text-left text-[11px] font-medium ${statusBadgeClass(post.status)}`}
                        title={post.caption}
                      >
                        {post.caption}
                      </button>
                    ))}
                    {overflowCount > 0 && (
                      <span className="px-1.5 text-[11px] text-muted-foreground">
                        +{overflowCount} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <DayPostsDialog
        day={selectedDay}
        posts={selectedDayPosts}
        onClose={() => setSelectedDay(null)}
        onPostClick={handlePostClick}
        onScheduleClick={() => setShowCreateDialog(true)}
      />

      <CreateScheduledPostDialog
        day={selectedDay}
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={fetchPosts}
      />

      <ReschedulePostDialog
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onRescheduled={fetchPosts}
      />
    </div>
  );
}
