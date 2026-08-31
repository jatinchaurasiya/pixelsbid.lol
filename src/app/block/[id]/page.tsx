import { mockStore } from "@/lib/mock-store";
import { getDb } from "@/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = mockStore.blocks.find(x=>x.id===id);
  return {
    title: b ? `${b.title || "Pixel Block"} — ${b.size}×${b.size} on PixelBids.lol` : "Pixel Block — PixelBids.lol",
    description: b ? `${b.title} — ${b.size}×${b.size} (${b.size*b.size} pixels) at ${b.x},${b.y}. ${b.clicks} clicks.` : "Pixel block",
  };
}

export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let b: (typeof mockStore.blocks)[number] | null = mockStore.blocks.find(x=>x.id===id) || null;
  if (!b) {
    const db = getDb();
    if (db) {
      try {
        const { pixelBlocks } = await import("@/db/schema");
        const rows = await db.select().from(pixelBlocks);
        const found = rows.find(r=>r.id===id) as unknown as typeof b;
        if (found) b = found as typeof b;
      } catch {}
    }
  }
  if (!b) {
    // Try raw SQL for neon
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(process.env.DATABASE_URL!);
      const rows = await sql`SELECT * FROM pixel_blocks WHERE id=${id} LIMIT 1`;
      if (rows.length) {
        const r = rows[0] as Record<string, unknown>;
        b = {
          id: r.id as string,
          x: r.x as number,
          y: r.y as number,
          size: r.size as number,
          ownerId: r.owner_id as string | null,
          status: r.status as string,
          imageUrl: r.image_url as string | null,
          targetUrl: r.target_url as string | null,
          title: r.title as string | null,
          category: r.category as string | null,
          clicks: r.clicks as number,
          impressions: r.impressions as number,
          priceCents: r.price_cents as number,
          reservedAt: (r.reserved_at as string) || null,
          reservationExpiresAt: (r.reservation_expires_at as string) || null,
          rentedAt: (r.rented_at as string) || null,
          expiresAt: (r.expires_at as string) || null,
        } as unknown as typeof b;
      }
    } catch {}
  }
  if (!b) return notFound();

  const daysLeft = b.expiresAt ? Math.max(0, Math.ceil((new Date(b.expiresAt).getTime() - Date.now())/86400000)) : null;

  return (
    <div className="mx-auto max-w-[1100px] px-3 sm:px-4 py-6 sm:py-8">
      <Link href="/" className="text-xs sm:text-sm font-bold text-zinc-700 hover:text-zinc-950 inline-flex items-center gap-1">
        ← Back to canvas
      </Link>
      <div className="mt-4 grid lg:grid-cols-[500px_1fr] gap-6 lg:gap-8">
        <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="aspect-square bg-zinc-100 grid place-items-center overflow-hidden">
            {b.imageUrl ? (
              <img src={b.imageUrl} alt={b.title || ""} className="w-full h-full object-contain p-6 bg-white" />
            ) : (
              <div className="text-zinc-400 text-xs sm:text-sm text-center p-4">Under review — ad will appear shortly</div>
            )}
          </div>
          <div className="p-3.5 sm:p-4 flex items-center justify-between text-xs border-t border-zinc-100">
            <span className="bg-zinc-900 text-white px-2.5 py-1 rounded-full font-bold text-[11px] sm:text-xs">
              {b.size}×{b.size} · {b.size * b.size} px
            </span>
            <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] sm:text-xs border ${b.status==="active" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : b.status==="pending_review" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-zinc-100 border-zinc-200"}`}>
              {b.status === "pending_review" ? "under review" : b.status}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-950">{b.title || "Untitled block"}</h1>
          <div className="mt-1.5 text-xs sm:text-sm text-zinc-600 break-all">{b.targetUrl || "Link will appear after approval"}</div>

          <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2 text-xs">
            <span className="bg-white border border-zinc-200 rounded-full px-3 py-1.5 font-medium">📍 {b.x}, {b.y}</span>
            <span className="bg-white border border-zinc-200 rounded-full px-3 py-1.5 font-medium">💰 {formatCents(b.priceCents)}</span>
            <span className="bg-white border border-zinc-200 rounded-full px-3 py-1.5 font-medium">👁 {b.impressions.toLocaleString()} impressions</span>
            <span className="bg-white border border-zinc-200 rounded-full px-3 py-1.5 font-medium">👆 {b.clicks.toLocaleString()} clicks</span>
            {daysLeft !== null && <span className="bg-amber-100 border border-amber-200 rounded-full px-3 py-1.5 font-bold text-amber-900">⏳ {daysLeft} days left</span>}
          </div>

          <a
            href={`/api/blocks/click?id=${b.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 w-full sm:w-auto inline-flex justify-center items-center bg-[#ff3b30] text-white rounded-full px-7 py-3.5 font-black text-sm hover:bg-[#e5352c] transition shadow-md active:scale-98"
          >
            Visit {b.title || "website"} →
          </a>

          <div className="mt-6 bg-white border border-zinc-200 rounded-3xl p-5 text-xs sm:text-sm leading-relaxed shadow-xs">
            <div className="font-black text-zinc-950 text-sm">About this billboard block</div>
            <p className="text-zinc-600 mt-1">
              This {b.size}×{b.size} square occupies {b.size * b.size} pixel-units on the 1000×1000 PixelBids.lol canvas.
              It was rented for 30 days and is tracked for clicks and impressions.
            </p>
            <div className="mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 font-mono">
              Block ID: {b.id} · Category: {(b as unknown as { category: string }).category || "AI"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="bg-white border border-zinc-200 rounded-2xl p-3 shadow-2xs">
              <div className="text-xl sm:text-2xl font-black text-zinc-950">{b.clicks}</div>
              <div className="text-[10px] sm:text-xs text-zinc-500 font-bold mt-0.5">Clicks</div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl p-3 shadow-2xs">
              <div className="text-xl sm:text-2xl font-black text-zinc-950">{b.size * b.size}</div>
              <div className="text-[10px] sm:text-xs text-zinc-500 font-bold mt-0.5">Pixels</div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl p-3 shadow-2xs">
              <div className="text-xl sm:text-2xl font-black text-zinc-950">{formatCents(b.priceCents)}</div>
              <div className="text-[10px] sm:text-xs text-zinc-500 font-bold mt-0.5">Paid</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <Link href="/dashboard" className="w-full sm:w-auto text-center border border-zinc-200 bg-white rounded-full px-5 py-2.5 font-bold text-xs hover:bg-zinc-50 transition shadow-2xs">
              Manage in dashboard
            </Link>
            <Link href="/" className="w-full sm:w-auto text-center bg-zinc-900 text-white rounded-full px-5 py-2.5 font-bold text-xs hover:bg-black transition shadow-xs">
              Rent another square
            </Link>
          </div>
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: b.title,
        image: b.imageUrl,
        url: b.targetUrl,
        offers: { price: (b.priceCents/100).toFixed(2), priceCurrency: "USD" }
      }) }} />
    </div>
  );
}
