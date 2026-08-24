import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { getDb } from "@/db";

function isAuthorized(req: Request): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return true; // dev/open preview mode
  const authHeader = req.headers.get("authorization") || req.headers.get("x-admin-secret");
  if (authHeader === `Bearer ${adminSecret}` || authHeader === adminSecret) {
    return true;
  }
  return false;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, action } = await req.json() as { id: string; action: "approve" | "reject" };
    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "id and valid action (approve|reject) required" }, { status: 400 });
    }

    const db = getDb();
    if (db) {
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(process.env.DATABASE_URL!);

        if (action === "approve") {
          await sql`
            UPDATE pixel_blocks
            SET status = 'active',
                rented_at = COALESCE(rented_at, NOW()),
                expires_at = NOW() + INTERVAL '30 days'
            WHERE id = ${id}
          `;
          await sql`
            UPDATE moderation_queue
            SET status = 'approved',
                reviewed_at = NOW()
            WHERE block_id = ${id}
          `;
          await sql`
            UPDATE orders
            SET status = 'succeeded',
                paid_at = COALESCE(paid_at, NOW())
            WHERE block_id = ${id} AND status != 'refunded'
          `;
        } else if (action === "reject") {
          await sql`
            UPDATE pixel_blocks
            SET status = 'rejected',
                image_url = NULL,
                target_url = NULL
            WHERE id = ${id}
          `;
          await sql`
            UPDATE moderation_queue
            SET status = 'rejected',
                reviewed_at = NOW()
            WHERE block_id = ${id}
          `;
          await sql`
            UPDATE orders
            SET status = 'refunded'
            WHERE block_id = ${id}
          `;
        }

        const rows = await sql`SELECT * FROM pixel_blocks WHERE id = ${id} LIMIT 1`;
        if (!rows.length) {
          return NextResponse.json({ error: "Block not found in DB" }, { status: 404 });
        }
        return NextResponse.json({ ok: true, block: rows[0], db: true });
      } catch (dbErr) {
        console.error("[admin/moderate] DB error:", dbErr);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }
    }

    // Mock store fallback
    const b = mockStore.blocks.find(x => x.id === id);
    if (!b) return NextResponse.json({ error: "Block not found" }, { status: 404 });

    if (action === "approve") {
      b.status = "active";
      b.rentedAt = new Date().toISOString();
      b.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (action === "reject") {
      b.status = "rejected";
      b.imageUrl = null;
      b.targetUrl = null;
      const o = mockStore.orders.find(x => x.blockId === id);
      if (o) o.status = "refunded";
    }

    return NextResponse.json({ ok: true, block: b, mock: true });
  } catch (e) {
    console.error("[admin/moderate] Error:", e);
    return NextResponse.json({ error: "Failed to process moderation request" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  if (db) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);

      await sql`DELETE FROM moderation_queue WHERE block_id = ${id}`;
      await sql`DELETE FROM orders WHERE block_id = ${id}`;
      await sql`DELETE FROM pixel_blocks WHERE id = ${id}`;

      return NextResponse.json({ ok: true, deleted: id, db: true });
    } catch (dbErr) {
      console.error("[admin/moderate DELETE] DB error:", dbErr);
      return NextResponse.json({ error: "Failed to delete from database" }, { status: 500 });
    }
  }

  const idx = mockStore.blocks.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: "Block not found" }, { status: 404 });
  mockStore.blocks.splice(idx, 1);
  return NextResponse.json({ ok: true, deleted: id, mock: true });
}

