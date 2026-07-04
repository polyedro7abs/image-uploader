import { env } from "@Polyedro-abs/env/server";
import { serveStatic } from "@hono/node-server/serve-static";
import { db } from "@/db";
import { mediaRoutes, postsRoutes, webhookRoutes } from "@/routes/posts";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
  }),
);

app.use("/uploads/*", serveStatic({ root: "./public/" }));

app.get("/", (c) => {
  return c.text("OK");
});

app.get("/health/db", (c) => {
  const result = db.get<{ ok: number }>(sql`select 1 as ok`);
  return c.json({ db: "ok", result });
});

app.route("/media", mediaRoutes);
app.route("/posts", postsRoutes);
app.route("/webhooks", webhookRoutes);

import { serve } from "@hono/node-server";

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
