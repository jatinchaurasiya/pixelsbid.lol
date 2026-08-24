import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { createDodoCheckout } from "@/lib/dodo";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reservationId, email, title, targetUrl, imageUrl, category } = body as {
      reservationId: string;
      email?: string;
      title?: string;
      targetUrl?: string;
      imageUrl?: string;
      category?: string;
    };
    const block = mockStore.blocks.find(b => b.id === reservationId);
    if (!block) return NextResponse.json({ error: "Reservation not found or expired" }, { status: 404 });
    if (block.status !== "reserved") return NextResponse.json({ error: `Block is ${block.status}, cannot checkout` }, { status: 409 });

    // enrich block with form data (pending)
    if (title) block.title = title;
    if (targetUrl) block.targetUrl = targetUrl;
    if (imageUrl) block.imageUrl = imageUrl;
    if (category) block.category = category;

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const result = await createDodoCheckout({
      amountCents: block.priceCents,
      reservationId,
      userId: block.ownerId || "anon",
      email,
      successUrl: `${origin}/rent/${reservationId}?paid=1`,
      cancelUrl: `${origin}/rent/${reservationId}?canceled=1`,
    });

    // create order record (mock)
    const orderId = `order_${reservationId}`;
    const existing = mockStore.orders.find(o => o.blockId === reservationId);
    if (!existing) {
      mockStore.orders.push({
        id: orderId,
        blockId: reservationId,
        userId: block.ownerId || "anon",
        dodoPaymentId: result.paymentId,
        amountCents: block.priceCents,
        status: "pending",
        createdAt: new Date().toISOString(),
        paidAt: null,
      });
    }

    return NextResponse.json({ checkoutUrl: result.checkoutUrl, paymentId: result.paymentId, isMock: result.isMock });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
