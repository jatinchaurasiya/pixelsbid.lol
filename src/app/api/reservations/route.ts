import { NextResponse } from "next/server";
import { mockStore, defaultConfig } from "@/lib/mock-store";
import { getDb } from "@/db";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { x, y, size, userId } = body as { x: number; y: number; size: number; userId?: string };
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(size)) {
      return NextResponse.json({ error: "x,y,size must be integers" }, { status: 400 });
    }
    const cfg = defaultConfig;
    if (size < cfg.minSize || size > cfg.maxSize) {
      return NextResponse.json({ error: `size must be ${cfg.minSize}–${cfg.maxSize}` }, { status: 400 });
    }
    if (x < 0 || y < 0 || x + size > cfg.width || y + size > cfg.height) {
      return NextResponse.json({ error: "Out of bounds" }, { status: 400 });
    }
    const priceCents = cfg.pricingMode === "linear" ? size * cfg.unitPriceCents : size * size * cfg.unitPriceCents;
    const id = nanoid();

    const db = getDb();
    if (!db) {
      if (!mockStore.canPlace(x, y, size)) {
        return NextResponse.json({ error: "That square overlaps an existing block — try another spot." }, { status: 409 });
      }
      const block = {
        id,
        x, y, size,
        ownerId: userId || "anon",
        status: "reserved" as const,
        imageUrl: null,
        targetUrl: null,
        title: null,
        category: null,
        clicks: 0,
        impressions: 0,
        priceCents,
        reservedAt: new Date().toISOString(),
        reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        rentedAt: null,
        expiresAt: null,
      };
      mockStore.blocks.push(block);
      return NextResponse.json({ id, priceCents, reservationExpiresAt: block.reservationExpiresAt });
    }

    // DB path with EXCLUDE constraint protection
    try {
      const { pixelBlocks } = await import("@/db/schema");
      await (db.insert(pixelBlocks) as unknown as { values: (v: unknown) => Promise<unknown> }).values({
        id: crypto.randomUUID(),
        x, y, size,
        ownerId: userId || null,
        status: "reserved",
        priceCents,
        reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      // fetch last inserted by x/y? For simplicity return id we generated via DB default - query back
      return NextResponse.json({ id: "db-reserved", priceCents });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("exclusion") || msg.includes("overlap") || msg.includes("gist")) {
        return NextResponse.json({ error: "Overlap detected — that space is already taken." }, { status: 409 });
      }
      throw e;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to reserve" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const found = mockStore.blocks.find(b => b.id === id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(found);
}
