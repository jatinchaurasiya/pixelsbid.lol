import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { mockStore } from "@/lib/mock-store";

export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json(mockStore.leaderboard());
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT id, x, y, size, title, image_url, target_url, clicks, price_cents, category FROM pixel_blocks WHERE status='active' ORDER BY size DESC, price_cents DESC, rented_at ASC LIMIT 50`;
    // normalize to camelCase for frontend
    const mapped = rows.map((r: Record<string, unknown>) => ({
      id: r.id, x: r.x, y: r.y, size: r.size, title: r.title, imageUrl: r.image_url, targetUrl: r.target_url, clicks: r.clicks, priceCents: r.price_cents, category: r.category
    }));
    return NextResponse.json(mapped);
  } catch (e) {
    console.error(e);
    return NextResponse.json(mockStore.leaderboard());
  }
}
