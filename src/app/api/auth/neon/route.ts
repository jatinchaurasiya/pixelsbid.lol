import { NextResponse } from "next/server";
import { verifyNeonToken, getJwksUrl, getNeonAuthUrl } from "@/lib/neon-auth";
import { getDb } from "@/db";

export async function GET() {
  return NextResponse.json({
    neonAuthUrl: getNeonAuthUrl(),
    jwksUrl: getJwksUrl(),
    status: "ok",
    hint: "Send POST with { token } to verify Neon Auth JWT. Header: Authorization: Bearer <token> also accepted.",
  });
}

export async function POST(req: Request) {
  try {
    let token: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);

    if (!token) {
      const body = await req.json().catch(() => ({}));
      token = (body as { token?: string }).token || null;
    }
    if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

    const user = await verifyNeonToken(token);
    if (!user) return NextResponse.json({ error: "invalid token" }, { status: 401 });

    // Optionally sync Neon Auth user to our Neon Postgres user table (Better Auth shape)
    const db = getDb();
    if (db && user.email) {
      try {
        const { user: userTable } = await import("@/db/schema");
        const existing = await db.select().from(userTable).limit(1);
        // Upsert: create user row if not exists so pixel_blocks.owner_id FK works
        // Use sql for upsert to avoid drizzle complexity
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(process.env.DATABASE_URL!);
        await sql`INSERT INTO "user" (id, email, name, image, email_verified, role) VALUES (${user.sub}, ${user.email}, ${user.name || user.email}, ${user.picture || null}, true, 'user') ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, image = EXCLUDED.image, updated_at = NOW()`;
        // also handle unique email conflict by id different — ignore
      } catch (e) {
        console.warn("[neon-auth] sync user failed", e);
      }
    }

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "verify failed" }, { status: 500 });
  }
}
