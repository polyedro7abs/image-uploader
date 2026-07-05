import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  mediaUrl: text("media_url").notNull(),
  caption: text("caption").notNull(),
  platforms: text("platforms").notNull(),
  status: text("status").notNull().default("DRAFT"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
  errorMessage: text("error_message"),
  platformResults: text("platform_results"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
