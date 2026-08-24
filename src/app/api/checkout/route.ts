import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { createDodoCheckout } from "@/lib/dodo";
import { getDb } from "@/db";

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

    const db = getDb();
    let block: { id: string; priceCents: number; ownerId?: string | null; status: string } | null = null;
    let priceCents = 0;

    if (db) {
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(process.env.DATABASE_URL!);
        const rows = await sql`SELECT id, price_cents, owner_id, status FROM pixel_blocks WHERE id=${reservationId} LIMIT 1`;
        if (rows.length) {
          const r = rows[0] as Record<string, unknown>;
          block = { id: r.id as string, priceCents: r.price_cents as number, ownerId: r.owner_id as string | null, status: r.status as string };
          priceCents = r.price_cents as number;
          if (r.status !== "reserved") return NextResponse.json({ error: `Block is ${r.status}, cannot checkout` }, { status: 409 });
          // enrich
          await sql`UPDATE pixel_blocks SET title=${title || null}, target_url=${targetUrl || null}, image_url=${imageUrl || null}, category=${category || null} WHERE id=${reservationId}`;
        } else {
          return NextResponse.json({ error: "Reservation not found or expired" }, { status: 404 });
        }
      } catch (e) {
        console.error("[checkout] db lookup failed", e);
        return NextResponse.json({ error: "Checkout lookup failed" }, { status: 500 });
      }
    } else {
      const b = mockStore.blocks.find(x => x.id === reservationId);
      if (!b) return NextResponse.json({ error: "Reservation not found or expired" }, { status: 404 });
      if (b.status !== "reserved") return NextResponse.json({ error: `Block is ${b.status}, cannot checkout` }, { status: 409 });
      if (title) b.title = title;
      if (targetUrl) b.targetUrl = targetUrl;
      if (imageUrl) b.imageUrl = imageUrl;
      if (category) b.category = category;
      block = { id: b.id, priceCents: b.priceCents, ownerId: b.ownerId, status: b.status };
      priceCents = b.priceCents;
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const result = await createDodoCheckout({
      amountCents: priceCents,
      reservationId,
      userId: block!.ownerId || "anon",
      email,
      successUrl: `${origin}/rent/${reservationId}?paid=1`,
      cancelUrl: `${origin}/rent/${reservationId}?canceled=1`,
    });

    // create order record
    if (db) {
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(process.env.DATABASE_URL!);
        await sql`INSERT INTO orders (block_id, user_id, dodo_payment_id, amount_cents, status) VALUES (${reservationId}, ${block!.ownerId || null}, ${result.paymentId}, ${priceCents}, 'pending') ON CONFLICT (dodo_payment_id) DO NOTHING`;
      } catch {}
    } else {
      const existing = mockStore.orders.find(o => o.blockId === reservationId);
      if (!existing) {
        mockStore.orders.push({
          id: `order_${reservationId}`,
          blockId: reservationId,
          userId: block!.ownerId || "anon",
          dodoPaymentId: result.paymentId,
          amountCents: priceCents,
          status: "pending",
          createdAt: new Date().toISOString(),
          paidAt: null,
        });
      }
    }

    return NextResponse.json({ checkoutUrl: result.checkoutUrl, paymentId: result.paymentId, isMock: result.isMock });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
