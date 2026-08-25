import { NextResponse } from "next/server";
import { mockStore, defaultConfig } from "@/lib/mock-store";
import { getDb } from "@/db";
import { sanitizeText, isSafePublicUrl, checkRateLimit } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const rate = checkRateLimit(`res_${ip}`, 30, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Reservation rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    const body = await req.json();
    const {
      x,
      y,
      size,
      userId,
      title,
      targetUrl,
      imageUrl,
      category,
    } = body as {
      x: number;
      y: number;
      size: number;
      userId?: string;
      title?: string;
      targetUrl?: string;
      imageUrl?: string;
      category?: string;
    };

    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(size)) {
      return NextResponse.json({ error: "Coordinates (x, y) and size must be integers" }, { status: 400 });
    }

    const cfg = defaultConfig;
    if (size < cfg.minSize || size > cfg.maxSize || size % 10 !== 0) {
      return NextResponse.json({ error: `Size must be a multiple of 10 between ${cfg.minSize} and ${cfg.maxSize} pixels` }, { status: 400 });
    }

    if (x < 0 || y < 0 || x + size > cfg.width || y + size > cfg.height || x % 10 !== 0 || y % 10 !== 0) {
      return NextResponse.json({ error: "Selection coordinates must align to 10px grid and stay within canvas bounds" }, { status: 400 });
    }

    // Sanitize user-provided fields
    const cleanTitle = title ? sanitizeText(title, 100) : null;
    let cleanTarget: string | null = null;
    if (targetUrl) {
      const check = isSafePublicUrl(targetUrl);
      cleanTarget = check.safe && check.url ? check.url.href : null;
    }
    const cleanImage = imageUrl ? (imageUrl.startsWith("data:image/") ? imageUrl.slice(0, 3 * 1024 * 1024) : sanitizeText(imageUrl, 2048)) : null;
    const cleanCat = category ? sanitizeText(category, 50) : "AI";

    // $1.00 USD per 10x10 block unit (100 pixels = $1.00)
    const blockUnits = Math.max(1, Math.round((size / 10) * (size / 10)));
    const priceCents = blockUnits * cfg.unitPriceCents;

    const db = getDb();
    if (!db) {
      mockStore.sweepExpired();
      if (!mockStore.canPlace(x, y, size)) {
        return NextResponse.json({ error: "That square overlaps an existing block — please pick an open area." }, { status: 409 });
      }
      const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const reservationExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const block = {
        id,
        x,
        y,
        size,
        ownerId: userId && userId !== "anon" ? userId : null,
        status: "reserved" as const,
        imageUrl: imageUrl || null,
        targetUrl: targetUrl || null,
        title: title || null,
        category: category || "AI",
        clicks: 0,
        impressions: 0,
        priceCents,
        reservedAt: new Date().toISOString(),
        reservationExpiresAt,
        rentedAt: null,
        expiresAt: null,
      };
      mockStore.blocks.push(block);
      return NextResponse.json({ id, priceCents, reservationExpiresAt });
    }

    // Real Neon PostgreSQL path with spatial exclusion constraint
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);

      // Proactively sweep expired holds
      await sql`
        UPDATE pixel_blocks
        SET status = 'expired'
        WHERE status = 'reserved' AND (reservation_expires_at < NOW() OR reservation_expires_at IS NULL)
      `;

      const id = crypto.randomUUID();
      const validOwnerId = userId && userId !== "anon" ? userId : null;

      try {
        await sql`
          INSERT INTO pixel_blocks (id, x, y, size, owner_id, status, price_cents, title, target_url, image_url, category, reservation_expires_at)
          VALUES (${id}, ${x}, ${y}, ${size}, ${validOwnerId}, 'reserved', ${priceCents}, ${cleanTitle}, ${cleanTarget}, ${cleanImage}, ${cleanCat}, NOW() + INTERVAL '10 minutes')
        `;
      } catch (insertErr) {
        const insertMsg = insertErr instanceof Error ? insertErr.message : String(insertErr);
        if (insertMsg.includes("pixel_blocks_owner_id_user_id_fk") || insertMsg.includes("foreign key")) {
          await sql`
            INSERT INTO pixel_blocks (id, x, y, size, owner_id, status, price_cents, title, target_url, image_url, category, reservation_expires_at)
            VALUES (${id}, ${x}, ${y}, ${size}, NULL, 'reserved', ${priceCents}, ${cleanTitle}, ${cleanTarget}, ${cleanImage}, ${cleanCat}, NOW() + INTERVAL '10 minutes')
          `;
        } else {
          throw insertErr;
        }
      }

      const rows = await sql`SELECT id, reservation_expires_at FROM pixel_blocks WHERE id = ${id}`;
      const expiresAtDate = rows[0]?.reservation_expires_at
        ? new Date(rows[0].reservation_expires_at).toISOString()
        : new Date(Date.now() + 600000).toISOString();

      return NextResponse.json({
        id,
        priceCents,
        reservationExpiresAt: expiresAtDate,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[reservations] DB error:", msg);
      if (
        msg.includes("pixel_blocks_no_overlap") ||
        msg.includes("exclusion") ||
        msg.includes("overlap") ||
        msg.includes("conflicting key") ||
        msg.includes("23P01")
      ) {
        return NextResponse.json({
          error: "That square is already reserved or occupied. Please select an open square on the grid.",
        }, { status: 409 });
      }
      return NextResponse.json({ error: msg || "Failed to reserve pixel block" }, { status: 500 });
    }
  } catch (e) {
    const errText = e instanceof Error ? e.message : String(e);
    console.error("[reservations] Handler error:", errText);
    return NextResponse.json({ error: errText || "Failed to process reservation" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id parameter required" }, { status: 400 });

  const db = getDb();
  if (db) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);
      const rows = await sql`SELECT * FROM pixel_blocks WHERE id = ${id} LIMIT 1`;
      if (rows.length) {
        const r = rows[0] as Record<string, unknown>;
        return NextResponse.json({
          id: r.id,
          x: r.x,
          y: r.y,
          size: r.size,
          ownerId: r.owner_id,
          status: r.status,
          imageUrl: r.image_url,
          targetUrl: r.target_url,
          title: r.title,
          category: r.category,
          clicks: r.clicks,
          impressions: r.impressions,
          priceCents: r.price_cents,
          reservedAt: r.reserved_at ? new Date(r.reserved_at as string | Date).toISOString() : null,
          reservationExpiresAt: r.reservation_expires_at ? new Date(r.reservation_expires_at as string | Date).toISOString() : null,
          rentedAt: r.rented_at ? new Date(r.rented_at as string | Date).toISOString() : null,
          expiresAt: r.expires_at ? new Date(r.expires_at as string | Date).toISOString() : null,
        });
      }
    } catch (e) {
      console.error("[reservations GET] DB error:", e);
    }
  }

  const found = mockStore.blocks.find(b => b.id === id);
  if (!found) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  return NextResponse.json(found);
}

