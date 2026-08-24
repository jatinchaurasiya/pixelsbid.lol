import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { mockStore } from "@/lib/mock-store";

export async function GET() {
  const db = getDb();
  if (!db) {
    return NextResponse.json(mockStore.leaderboard());
  }
  try {
    const { pixelBlocks } = await import("@/db/schema");
    const rows = await db.select().from(pixelBlocks);
    const sorted = rows.filter(r => r.status === "active").sort((a,b) => b.size - a.size || (b.priceCents||0) - (a.priceCents||0)).slice(0, 50);
    return NextResponse.json(sorted);
  } catch {
    return NextResponse.json(mockStore.leaderboard());
  }
}
