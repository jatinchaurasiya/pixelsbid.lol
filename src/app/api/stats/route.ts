import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { mockStore } from "@/lib/mock-store";

export async function GET() {
  const db = getDb();
  if (!db) {
    const s = mockStore.stats();
    return NextResponse.json(s, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL!);
    // sweep
    try {
      await sql`UPDATE pixel_blocks SET status='expired', image_url=NULL, target_url=NULL WHERE status='reserved' AND reservation_expires_at < NOW()`;
      await sql`UPDATE pixel_blocks SET status='expired', image_url=NULL, target_url=NULL WHERE status='active' AND expires_at < NOW()`;
    } catch {}
    const rows = await sql`SELECT count(*)::int as active, coalesce(sum(price_cents),0)::int as revenue, coalesce(sum(size*size),0)::int as used FROM pixel_blocks WHERE status='active'`;
    const active = rows[0]?.active || 0;
    const revenue = rows[0]?.revenue || 0;
    const used = rows[0]?.used || 0;
    const pct = ((used / (1000*1000)) * 100).toFixed(3);
    // visitors: use site_stats if exists else mock progression
    let visitors = 12483;
    try {
      const v = await sql`SELECT visitors FROM site_stats ORDER BY date DESC LIMIT 1`;
      if (v.length) visitors = Number(v[0].visitors);
    } catch {}
    return NextResponse.json({
      totalBlocks: active,
      used,
      pct,
      revenueCents: revenue,
      visitors: visitors + Math.floor(Math.random()*5),
      liveViewers: 42 + Math.floor(Math.random()*18),
      totalArea: 1_000_000,
      neon: true,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    const s = mockStore.stats();
    return NextResponse.json(s, { headers: { "Cache-Control": "no-store" } });
  }
}
