import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { getDb } from "@/db";

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev mode
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}` || auth === secret) return true;
  return false;
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  if (db) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);

      // Sweep expired 10-min reservations
      const sweptReservations = await sql`
        UPDATE pixel_blocks
        SET status = 'expired', image_url = NULL, target_url = NULL
        WHERE status = 'reserved' AND reservation_expires_at < NOW()
        RETURNING id
      `;

      // Sweep expired 30-day active leases
      const sweptLeases = await sql`
        UPDATE pixel_blocks
        SET status = 'expired', image_url = NULL, target_url = NULL
        WHERE status = 'active' AND expires_at < NOW()
        RETURNING id
      `;

      return NextResponse.json({
        ok: true,
        swept: true,
        db: true,
        expiredReservations: sweptReservations.length,
        expiredLeases: sweptLeases.length,
        timestamp: new Date().toISOString(),
      });
    } catch (dbErr) {
      console.error("[cron/sweep] DB error:", dbErr);
      return NextResponse.json({ error: "DB sweep failed" }, { status: 500 });
    }
  }

  // Fallback mockStore
  mockStore.sweepExpired();
  const expired = mockStore.blocks.filter(b => b.status === "expired").length;
  return NextResponse.json({
    ok: true,
    swept: true,
    mock: true,
    expired,
    total: mockStore.blocks.length,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  return GET(req);
}

