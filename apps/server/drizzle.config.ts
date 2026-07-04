import { env } from "@Polyedro-abs/env/server";
import { defineConfig } from "drizzle-kit";

const isSqlite = env.DATABASE_URL.startsWith("file:");

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: isSqlite ? "sqlite" : "postgresql",
  dbCredentials: isSqlite
    ? { url: env.DATABASE_URL.replace(/^file:/, "") }
    : { url: env.DIRECT_URL ?? env.DATABASE_URL },
});
