import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";

export async function GET(req: Request) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json({ authenticated: false, blocks: [] });
    }

    const userId = session.user.id;
    const db = getDb();

    if (db) {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);

      const rows = await sql`
        SELECT 
          id, x, y, size, status, image_url, target_url, title, category, clicks, impressions, price_cents,
          reserved_at, reservation_expires_at, rented_at, expires_at
        FROM pixel_blocks
        WHERE owner_id = ${userId}
        ORDER BY COALESCE(rented_at, reserved_at) DESC
      `;

      return NextResponse.json({
        authenticated: true,
        user: { id: session.user.id, email: session.user.email, name: session.user.name },
        blocks: rows.map((r) => ({
          id: r.id,
          x: r.x,
          y: r.y,
          size: r.size,
          status: r.status,
          imageUrl: r.image_url,
          targetUrl: r.target_url,
          title: r.title,
          category: r.category,
          clicks: r.clicks,
          priceCents: r.price_cents,
          reservedAt: r.reserved_at ? new Date(r.reserved_at as string | Date).toISOString() : null,
          expiresAt: r.expires_at ? new Date(r.expires_at as string | Date).toISOString() : null,
        })),
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: { id: session.user.id, email: session.user.email, name: session.user.name },
      blocks: [],
    });
  } catch (err) {
    console.error("[user/blocks] Error:", err);
    return NextResponse.json({ error: "Failed to fetch user blocks" }, { status: 500 });
  }
}
