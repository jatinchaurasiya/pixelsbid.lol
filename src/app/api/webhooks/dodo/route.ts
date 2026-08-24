import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { getDb } from "@/db";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(body); } catch { payload = {}; }

    const event = (payload.type || payload.event || "") as string;
    const data = (payload.data || payload) as Record<string, unknown>;
    const paymentId = (data.dodo_payment_id || data.payment_id || data.id) as string | undefined;
    const metadata = (data.metadata || {}) as Record<string, string>;
    const reservationId = metadata.reservation_id || (data.reservation_id as string);

    if (event && !event.includes("succeeded") && !event.includes("paid") && event !== "payment.succeeded") {
      return NextResponse.json({ ok: true, ignored: event });
    }

    const db = getDb();
    if (db) {
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(process.env.DATABASE_URL!);
        // Idempotency: check order already succeeded
        if (paymentId) {
          const existing = await sql`SELECT status FROM orders WHERE dodo_payment_id=${paymentId} LIMIT 1`;
          if (existing.length && existing[0].status === "succeeded") return NextResponse.json({ ok: true, deduped: true });
        }
        if (reservationId) {
          // Mark order succeeded
          if (paymentId) {
            await sql`UPDATE orders SET status='succeeded', paid_at=NOW(), dodo_payment_id=${paymentId} WHERE block_id=${reservationId} AND status='pending'`;
            // if no row updated, insert
            const check = await sql`SELECT id FROM orders WHERE dodo_payment_id=${paymentId} LIMIT 1`;
            if (!check.length) {
              const b = await sql`SELECT price_cents, owner_id FROM pixel_blocks WHERE id=${reservationId} LIMIT 1`;
              if (b.length) await sql`INSERT INTO orders (block_id, user_id, dodo_payment_id, amount_cents, status, paid_at) VALUES (${reservationId}, ${b[0].owner_id}, ${paymentId}, ${b[0].price_cents}, 'succeeded', NOW()) ON CONFLICT (dodo_payment_id) DO NOTHING`;
            }
          }
          // Move block to pending_review then auto-active after 2s simulation
          await sql`UPDATE pixel_blocks SET status='pending_review', rented_at=NOW(), expires_at=NOW() + INTERVAL '30 days' WHERE id=${reservationId} AND status='reserved'`;
          // enqueue moderation (optional)
          await sql`INSERT INTO moderation_queue (block_id, status) VALUES (${reservationId}, 'pending') ON CONFLICT DO NOTHING`;
          // Simulate auto-approve if no manual step — in prod this would be async after Rekognition
          setTimeout(async () => {
            try {
              const s = neon(process.env.DATABASE_URL!);
              await s`UPDATE pixel_blocks SET status='active' WHERE id=${reservationId} AND status='pending_review'`;
              await s`UPDATE moderation_queue SET status='approved', reviewed_at=NOW() WHERE block_id=${reservationId} AND status='pending'`;
            } catch {}
          }, 2000);
        }
        return NextResponse.json({ ok: true, db: true });
      } catch (e) {
        console.error("[webhook db]", e);
      }
    }

    // Fallback mockStore
    if (paymentId) {
      const existing = mockStore.orders.find(o => o.dodoPaymentId === paymentId && o.status === "succeeded");
      if (existing) return NextResponse.json({ ok: true, deduped: true });
    }
    const block = reservationId ? mockStore.blocks.find(b => b.id === reservationId) : undefined;
    if (block) {
      block.status = "pending_review";
      block.rentedAt = new Date().toISOString();
      block.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (paymentId) {
      const order = mockStore.orders.find(o => o.dodoPaymentId === paymentId) || mockStore.orders.find(o => o.blockId === reservationId);
      if (order) { order.status = "succeeded"; order.dodoPaymentId = paymentId; order.paidAt = new Date().toISOString(); }
      else if (reservationId) mockStore.orders.push({ id: `order_${Date.now()}`, blockId: reservationId, userId: block?.ownerId || "anon", dodoPaymentId: paymentId, amountCents: block?.priceCents || 100, status: "succeeded", createdAt: new Date().toISOString(), paidAt: new Date().toISOString() });
    }
    if (block) setTimeout(() => { if (block.status === "pending_review") block.status = "active"; }, 2000);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook]", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "dodo-webhook", neonDb: !!process.env.DATABASE_URL });
}
