import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!databaseUrl) {
    return null;
  }
  if (!db) {
    const sql = neon(databaseUrl);
    db = drizzle(sql, { schema });
  }
  return db;
}

export * from "./schema";
export type DbType = NonNullable<ReturnType<typeof getDb>>;
