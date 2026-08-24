import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { mockStore, defaultConfig } from "@/lib/mock-store";

export async function GET() {
  const db = getDb();
  if (!db) {
    mockStore.sweepExpired();
    return NextResponse.json({
      config: defaultConfig,
      blocks: mockStore.blocks.filter(b => ["active","reserved","pending_review"].includes(b.status)),
    });
  }
  try {
    const { pixelBlocks, canvasConfig } = await import("@/db/schema");
    const configRows = await db.select().from(canvasConfig).limit(1);
    const cfg = configRows[0] || { width: 1000, height: 1000, unitPriceCents: 100, pricingMode: "squared", leaseDays: 30, minSize: 1, maxSize: 50 };
    // sweep expired via SQL (fast)
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);
      await sql`UPDATE pixel_blocks SET status='expired', image_url=NULL, target_url=NULL WHERE status='reserved' AND reservation_expires_at < NOW()`;
      await sql`UPDATE pixel_blocks SET status='expired', image_url=NULL, target_url=NULL WHERE status='active' AND expires_at < NOW()`;
    } catch {}
    const blocks = await db.select().from(pixelBlocks);
    const filtered = blocks.filter(b => ["active","reserved","pending_review"].includes(b.status as string));
    return NextResponse.json({ config: cfg, blocks: filtered });
  } catch (e) {
    console.error(e);
    mockStore.sweepExpired();
    return NextResponse.json({ config: defaultConfig, blocks: mockStore.blocks.filter(b => ["active","reserved","pending_review"].includes(b.status)) });
  }
}
