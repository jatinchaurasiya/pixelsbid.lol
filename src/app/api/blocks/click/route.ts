import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";
import { getDb } from "@/db";

function sanitizeRedirectUrl(targetUrl: string | null | undefined, fallbackOrigin: string): string {
  if (!targetUrl) return `${fallbackOrigin}/`;
  const trimmed = targetUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const origin = new URL(req.url).origin;

  if (!id) return NextResponse.redirect(`${origin}/`, 302);

  const db = getDb();
  if (db) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);
      const rows = await sql`
        UPDATE pixel_blocks
        SET clicks = clicks + 1
        WHERE id = ${id}
        RETURNING target_url
      `;
      if (rows.length > 0) {
        const dest = sanitizeRedirectUrl(rows[0].target_url as string | null, origin);
        return NextResponse.redirect(dest, 302);
      }
    } catch (e) {
      console.error("[blocks/click GET] DB error:", e);
    }
  }

  // Fallback to mockStore
  const b = mockStore.blocks.find(x => x.id === id);
  if (b) {
    b.clicks += 1;
    const dest = sanitizeRedirectUrl(b.targetUrl, origin);
    return NextResponse.redirect(dest, 302);
  }

  return NextResponse.redirect(`${origin}/`, 302);
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

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

