import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { createDodoCheckout } from "@/lib/dodo";
import { getDb } from "@/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reservationId, email, name, title, targetUrl, imageUrl, category } = body as {
      reservationId: string;
      email?: string;
      name?: string;
      title?: string;
      targetUrl?: string;
      imageUrl?: string;
      category?: string;
    };

    if (!reservationId) {
      return NextResponse.json({ error: "reservationId is required" }, { status: 400 });
    }

    const db = getDb();
    let block: { id: string; priceCents: number; ownerId?: string | null; status: string } | null = null;
    let priceCents = 0;

    if (db) {
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(process.env.DATABASE_URL!);
        const rows = await sql`
          SELECT id, price_cents, owner_id, status, reservation_expires_at
          FROM pixel_blocks
          WHERE id = ${reservationId}
          LIMIT 1
        `;

        if (!rows.length) {
          return NextResponse.json({ error: "Reservation not found or expired" }, { status: 404 });
        }

        const r = rows[0] as Record<string, unknown>;
        if (r.status !== "reserved") {
          return NextResponse.json({ error: `Block is currently '${r.status}', cannot checkout.` }, { status: 409 });
        }

        const expiresAt = r.reservation_expires_at
          ? new Date(r.reservation_expires_at as string | Date).getTime()
          : null;
        if (expiresAt && expiresAt < Date.now()) {
          // Mark expired in DB
          await sql`UPDATE pixel_blocks SET status = 'expired' WHERE id = ${reservationId}`;
          return NextResponse.json(
            { error: "Reservation hold has expired (10-minute limit). Please select again." },
            { status: 410 }
          );
        }

        block = {
          id: r.id as string,
          priceCents: r.price_cents as number,
          ownerId: r.owner_id as string | null,
          status: r.status as string,
        };
        priceCents = r.price_cents as number;

        // Enrich block metadata
        await sql`
          UPDATE pixel_blocks
          SET title = ${title || null},
              target_url = ${targetUrl || null},
              image_url = ${imageUrl || null},
              category = ${category || null}
          WHERE id = ${reservationId}
        `;
      } catch (e) {
        console.error("[checkout] DB lookup error:", e);
        return NextResponse.json({ error: "Database error during checkout lookup" }, { status: 500 });
      }
    } else {
      const b = mockStore.blocks.find(x => x.id === reservationId);
      if (!b) return NextResponse.json({ error: "Reservation not found or expired" }, { status: 404 });
      if (b.status !== "reserved") return NextResponse.json({ error: `Block is '${b.status}', cannot checkout.` }, { status: 409 });

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
      name: name || title || "PixelsBid Advertiser",
      email,
      successUrl: `${origin}/rent/${encodeURIComponent(reservationId)}?paid=1`,
      cancelUrl: `${origin}/rent/${encodeURIComponent(reservationId)}?canceled=1`,
    });

    // Record order entry
    if (db) {
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(process.env.DATABASE_URL!);
        await sql`
          INSERT INTO orders (block_id, user_id, dodo_payment_id, amount_cents, status)
          VALUES (${reservationId}, ${block!.ownerId || null}, ${result.paymentId}, ${priceCents}, 'pending')
          ON CONFLICT (dodo_payment_id) DO NOTHING
        `;
      } catch (orderErr) {
        console.warn("[checkout] Order recording warning:", orderErr);
      }
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

    return NextResponse.json({
      ok: true,
      checkoutUrl: result.checkoutUrl,
      paymentId: result.paymentId,
      isMock: result.isMock,
    });
  } catch (e) {
    console.error("[checkout] Handler error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout initiation failed" }, { status: 500 });
  }
}

