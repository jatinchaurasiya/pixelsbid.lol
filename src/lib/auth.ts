import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

function createAuth() {
  const db = getDb();
  let database: ReturnType<typeof drizzleAdapter> | undefined;
  if (db) {
    // drizzleAdapter expects a drizzle instance
    database = drizzleAdapter(db, { provider: "pg", schema });
  }
  return betterAuth({
    // When DATABASE_URL is missing (preview), Better Auth still initializes but DB ops will fail gracefully
    database: database as unknown as ReturnType<typeof drizzleAdapter>,
    emailAndPassword: { enabled: true },
    emailVerification: { sendOnSignUp: false },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "mock-client-id",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
      },
    },
    session: {
      cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 7 },
    },
    secret: process.env.BETTER_AUTH_SECRET || "pixelsbid-dev-secret-please-change-in-prod-32chars",
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    trustedOrigins: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://pixelsbid.lol",
      "https://*.vercel.app",
      "https://ep-noisy-sunset-ay4d2mrm.neonauth.c-5.us-east-2.aws.neon.tech",
    ],
  });
}

// Lazy singleton — ensures DATABASE_URL is read at request time, not build time
let _auth: unknown | null = null;
export function getAuth() {
  if (!_auth) _auth = createAuth();
  return _auth as ReturnType<typeof betterAuth>;
}

// For backward compat where auth is imported directly
export const auth = getAuth();

export type Session = typeof auth.$Infer.Session;
