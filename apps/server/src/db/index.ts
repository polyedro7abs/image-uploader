import { env } from "@Polyedro-abs/env/server";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlitePath = env.DATABASE_URL.replace(/^file:/, "");
const client = new Database(sqlitePath);

client.pragma("journal_mode = WAL");

export const db = drizzle(client, { schema });
