import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { getDb } from "@/db";
import { sanitizeRedirect, checkRateLimit } from "@/lib/security";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const origin = new URL(req.url).origin;

  if (!id) return NextResponse.redirect(`${origin}/`, 302);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const rate = checkRateLimit(`click_get_${ip}_${id}`, 60, 60 * 1000);

  const db = getDb();
  if (db) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);
      
      let rows;
      if (rate.allowed) {
        rows = await sql`
          UPDATE pixel_blocks
          SET clicks = clicks + 1
          WHERE id = ${id}
          RETURNING target_url
        `;
      } else {
        rows = await sql`
          SELECT target_url FROM pixel_blocks WHERE id = ${id} LIMIT 1
        `;
      }

      if (rows.length > 0) {
        const dest = sanitizeRedirect(rows[0].target_url as string | null, origin);
        return NextResponse.redirect(dest, 302);
      }
    } catch (e) {
      console.error("[blocks/click GET] DB error:", e);
    }
  }

  // Fallback to mockStore
  const b = mockStore.blocks.find(x => x.id === id);
  if (b) {
    if (rate.allowed) b.clicks += 1;
    const dest = sanitizeRedirect(b.targetUrl, origin);
    return NextResponse.redirect(dest, 302);
  }

  return NextResponse.redirect(`${origin}/`, 302);
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const rate = checkRateLimit(`click_post_${ip}_${id}`, 30, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Click rate limit exceeded" }, { status: 429 });
    }

    const db = getDb();
    if (db) {
      try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(process.env.DATABASE_URL!);
        const rows = await sql`
          UPDATE pixel_blocks
          SET clicks = clicks + 1
          WHERE id = ${id}
          RETURNING clicks
        `;
        if (rows.length > 0) {
          return NextResponse.json({ ok: true, clicks: rows[0].clicks, db: true });
        }
      } catch (e) {
        console.error("[blocks/click POST] DB error:", e);
      }
    }

    const b = mockStore.blocks.find(x => x.id === id);
    if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
    b.clicks += 1;
    return NextResponse.json({ ok: true, clicks: b.clicks, mock: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

