import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    // verify signature if DODO_WEBHOOK_SECRET set
    const sig = req.headers.get("x-dodo-signature") || req.headers.get("webhook-signature") || "";
    // Allow mock pass if no secret configured
    // Real verification would use standardwebhooks

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

    // Idempotency: if order already succeeded, ignore
    if (paymentId) {
      const existing = mockStore.orders.find(o => o.dodoPaymentId === paymentId && o.status === "succeeded");
      if (existing) return NextResponse.json({ ok: true, deduped: true });
    }

    const block = reservationId ? mockStore.blocks.find(b => b.id === reservationId) : undefined;
    if (block) {
      block.status = "pending_review";
      block.rentedAt = new Date().toISOString();
      block.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      // moderation auto-pass if no flags (simulate)
      // In real life, would push to moderation_queue table and run Rekognition
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

    // Auto-approve after short delay to simulate moderation (if not rejected)
    if (block) {
      setTimeout(() => {
        if (block.status === "pending_review") {
          block.status = "active";
        }
      }, 2000);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook]", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "dodo-webhook" });
}
