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
  // Real DB path (Neon) - add exclusion-aware query
  try {
    const { pixelBlocks, canvasConfig } = await import("@/db/schema");
    const configRows = await db.select().from(canvasConfig).limit(1);
    const cfg = configRows[0] || { width: 1000, height: 1000, unitPriceCents: 100, pricingMode: "squared", leaseDays: 30, minSize: 1, maxSize: 50 };
    const blocks = await db.select().from(pixelBlocks);
    // filter server-side for active states
    const filtered = blocks.filter(b => ["active","reserved","pending_review"].includes(b.status as string));
    return NextResponse.json({ config: cfg, blocks: filtered });
  } catch (e) {
    console.error(e);
    mockStore.sweepExpired();
    return NextResponse.json({ config: defaultConfig, blocks: mockStore.blocks.filter(b => ["active","reserved","pending_review"].includes(b.status)) });
  }
}
