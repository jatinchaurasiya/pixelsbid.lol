import { NextResponse } from "next/server";
import { mockStore, defaultConfig } from "@/lib/mock-store";
import { getDb } from "@/db";

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

    const db = getDb();
    if (!db) {
      if (!mockStore.canPlace(x, y, size)) {
        return NextResponse.json({ error: "That square overlaps an existing block — try another spot." }, { status: 409 });
      }
      const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
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

    // Real Neon path — relies on EXCLUDE constraint for race safety
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);
      const id = crypto.randomUUID();
      // Use raw SQL to ensure region generated column + exclusion works correctly
      await sql`INSERT INTO pixel_blocks (id, x, y, size, owner_id, status, price_cents, reservation_expires_at) VALUES (${id}, ${x}, ${y}, ${size}, ${userId || null}, 'reserved', ${priceCents}, NOW() + INTERVAL '10 minutes')`;
      const rows = await sql`SELECT id, reservation_expires_at FROM pixel_blocks WHERE id=${id}`;
      return NextResponse.json({ id, priceCents, reservationExpiresAt: rows[0]?.reservation_expires_at || new Date(Date.now()+600000).toISOString() });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[reservations] db error", msg);
      if (msg.includes("pixel_blocks_no_overlap") || msg.includes("exclusion") || msg.includes("overlap") || msg.includes("conflicting key")) {
        return NextResponse.json({ error: "Overlap detected — that space is already taken. The EXCLUDE constraint prevented it." }, { status: 409 });
      }
      // Also handle FK violation if userId invalid — retry as anon
      if (msg.includes("pixel_blocks_owner_id")) {
        try {
          const { neon } = await import("@neondatabase/serverless");
          const sql = neon(process.env.DATABASE_URL!);
          const id = crypto.randomUUID();
          await sql`INSERT INTO pixel_blocks (id, x, y, size, owner_id, status, price_cents, reservation_expires_at) VALUES (${id}, ${x}, ${y}, ${size}, NULL, 'reserved', ${priceCents}, NOW() + INTERVAL '10 minutes')`;
          return NextResponse.json({ id, priceCents });
        } catch (e2) {
          return NextResponse.json({ error: "Failed to reserve (user FK)" }, { status: 500 });
        }
      }
      return NextResponse.json({ error: "Failed to reserve" }, { status: 500 });
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
  const db = getDb();
  if (db) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);
      const rows = await sql`SELECT * FROM pixel_blocks WHERE id=${id} LIMIT 1`;
      if (rows.length) {
        const r = rows[0] as Record<string, unknown>;
        // Normalize to mock shape
        return NextResponse.json({
          id: r.id,
          x: r.x, y: r.y, size: r.size,
          ownerId: r.owner_id,
          status: r.status,
          imageUrl: r.image_url,
          targetUrl: r.target_url,
          title: r.title,
          category: r.category,
          clicks: r.clicks,
          impressions: r.impressions,
          priceCents: r.price_cents,
          reservedAt: r.reserved_at,
          reservationExpiresAt: r.reservation_expires_at,
          rentedAt: r.rented_at,
          expiresAt: r.expires_at,
        });
      }
    } catch {}
  }
  const found = mockStore.blocks.find(b => b.id === id);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(found);
}
