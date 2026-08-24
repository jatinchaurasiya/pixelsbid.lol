import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle> | null = null;
let cachedUrl: string | null = null;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }
  if (!db || cachedUrl !== databaseUrl) {
    const sql = neon(databaseUrl);
    db = drizzle(sql, { schema });
    cachedUrl = databaseUrl;
  }
  return db;
}

export * from "./schema";
export type DbType = NonNullable<ReturnType<typeof getDb>>;
