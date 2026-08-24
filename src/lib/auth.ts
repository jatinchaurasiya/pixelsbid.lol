import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

const db = getDb();

// Better Auth requires a DB; for demo/Vercel preview without DATABASE_URL we use a mock secret and in-memory fallback
// In production with DATABASE_URL set, this connects to Neon
// When DATABASE_URL is missing, we still initialise with a dummy adapter that won't be used (client auth falls back to mock)
let database: ReturnType<typeof drizzleAdapter> | undefined;
if (db) {
  database = drizzleAdapter(db, { provider: "pg", schema });
}
export const auth = betterAuth({
  database: database as unknown as ReturnType<typeof drizzleAdapter>,
  emailAndPassword: { enabled: true },
  emailVerification: { sendOnSignUp: false },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "mock",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock",
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 7 },
  },
  secret: process.env.BETTER_AUTH_SECRET || "pixelsbid-dev-secret-please-change-in-prod-32chars",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  trustedOrigins: ["http://localhost:3000", "https://pixelsbid.lol", "https://*.vercel.app"],
});

export type Session = typeof auth.$Infer.Session;
