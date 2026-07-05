import { PostStatus, type Post } from "@Polyedro-abs/types";

export function statusBadgeClass(status: Post["status"]): string {
  switch (status) {
    case PostStatus.DRAFT:
      return "bg-muted text-muted-foreground";
    case PostStatus.SCHEDULED:
      return "bg-blue-500 text-white dark:bg-blue-600";
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
