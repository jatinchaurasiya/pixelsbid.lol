import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { getDb } from "@/db";
import { verifyDodoWebhookHeaders } from "@/lib/dodo";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    // Extract all headers for verification
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key.toLowerCase()] = value;
    });

    // Cryptographically verify signature with DODO_WEBHOOK_SECRET
    const isValid = verifyDodoWebhookHeaders(rawBody, headersObj);
    if (!isValid) {
      console.error("[Dodo Webhook] Unauthorized - invalid signature");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const event = (payload.type || payload.event || "") as string;
    const data = (payload.data || payload) as Record<string, unknown>;
    const paymentId = (data.dodo_payment_id || data.payment_id || data.id) as string | undefined;
    const metadata = (data.metadata || {}) as Record<string, string>;
    const reservationId = metadata.reservation_id || (data.reservation_id as string);

    // Handle payment.succeeded / payment.paid
    const isPaymentSucceeded =
      event === "payment.succeeded" ||
      event.includes("succeeded") ||
      event.includes("paid");

    const isRefunded =
      event === "refund.succeeded" ||
      event === "payment.refunded" ||
      event.includes("refund");

    if (!isPaymentSucceeded && !isRefunded) {
      return NextResponse.json({ ok: true, ignored: event });
    }

    const db = getDb();
    if (db) {
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(process.env.DATABASE_URL!);

        if (isPaymentSucceeded) {
          // Idempotency check on order
          if (paymentId) {
            const existing = await sql`SELECT status FROM orders WHERE dodo_payment_id=${paymentId} LIMIT 1`;
            if (existing.length && existing[0].status === "succeeded") {
              return NextResponse.json({ ok: true, deduped: true });
            }
          }

          if (reservationId) {
            // Update or create order
            if (paymentId) {
              await sql`UPDATE orders SET status='succeeded', paid_at=NOW(), dodo_payment_id=${paymentId} WHERE block_id=${reservationId} AND status='pending'`;
              const check = await sql`SELECT id FROM orders WHERE dodo_payment_id=${paymentId} LIMIT 1`;
              if (!check.length) {
                const b = await sql`SELECT price_cents, owner_id FROM pixel_blocks WHERE id=${reservationId} LIMIT 1`;
                if (b.length) {
                  await sql`INSERT INTO orders (block_id, user_id, dodo_payment_id, amount_cents, status, paid_at) VALUES (${reservationId}, ${b[0].owner_id}, ${paymentId}, ${b[0].price_cents}, 'succeeded', NOW()) ON CONFLICT (dodo_payment_id) DO NOTHING`;
                }
              }
            }

            // Transition block to active (30 days from payment)
            await sql`UPDATE pixel_blocks SET status='active', rented_at=NOW(), expires_at=NOW() + INTERVAL '30 days' WHERE id=${reservationId}`;

            // Also record in moderation queue for audit trail
            await sql`INSERT INTO moderation_queue (block_id, status) VALUES (${reservationId}, 'approved') ON CONFLICT DO NOTHING`;
          }
          return NextResponse.json({ ok: true, event: "payment.succeeded", db: true });
        }

        if (isRefunded && (paymentId || reservationId)) {
          if (paymentId) {
            await sql`UPDATE orders SET status='refunded' WHERE dodo_payment_id=${paymentId}`;
          }
          if (reservationId) {
            await sql`UPDATE pixel_blocks SET status='rejected', image_url=NULL, target_url=NULL WHERE id=${reservationId}`;
          }
          return NextResponse.json({ ok: true, event: "refund.succeeded", db: true });
        }
      } catch (dbErr) {
        console.error("[Dodo Webhook] DB error:", dbErr);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }
    }

    // Fallback in-memory mockStore for non-DB dev environments
    if (isPaymentSucceeded) {
      if (paymentId) {
        const existing = mockStore.orders.find(o => o.dodoPaymentId === paymentId && o.status === "succeeded");
        if (existing) return NextResponse.json({ ok: true, deduped: true });
      }
      const block = reservationId ? mockStore.blocks.find(b => b.id === reservationId) : undefined;
      if (block) {
        block.status = "active";
        block.rentedAt = new Date().toISOString();
        block.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (paymentId) {
        const order = mockStore.orders.find(o => o.dodoPaymentId === paymentId) || mockStore.orders.find(o => o.blockId === reservationId);
        if (order) {
          order.status = "succeeded";
          order.dodoPaymentId = paymentId;
          order.paidAt = new Date().toISOString();
        } else if (reservationId) {
          mockStore.orders.push({
            id: `order_${Date.now()}`,
            blockId: reservationId,
            userId: block?.ownerId || "anon",
            dodoPaymentId: paymentId,
            amountCents: block?.priceCents || 100,
            status: "succeeded",
            createdAt: new Date().toISOString(),
            paidAt: new Date().toISOString(),
          });
        }
      }
      return NextResponse.json({ ok: true, mock: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[Dodo Webhook] unexpected error:", e);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "dodo-webhook",
    neonDb: !!process.env.DATABASE_URL,
    configuredSecret: !!process.env.DODO_WEBHOOK_SECRET,
  });
}

