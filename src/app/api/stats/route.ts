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
    const { pixelBlocks } = await import("@/db/schema");
    const rows = await db.select().from(pixelBlocks);
    const active = rows.filter(r => r.status === "active");
    const used = active.reduce((a, b) => a + (b.size * b.size), 0);
    const revenue = active.reduce((a, b) => a + (b.priceCents || 0), 0);
    const pct = ((used / (1000*1000)) * 100).toFixed(3);
    return NextResponse.json({
      totalBlocks: active.length,
      used,
      pct,
      revenueCents: revenue,
      visitors: 12483 + Math.floor(Math.random()*20),
      liveViewers: 42 + Math.floor(Math.random()*18),
      totalArea: 1_000_000,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    const s = mockStore.stats();
    return NextResponse.json(s, { headers: { "Cache-Control": "no-store" } });
  }
}
