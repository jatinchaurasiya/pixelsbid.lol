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
    title: b ? `${b.title || "Pixel Block"} — ${b.size}×${b.size} on PixelsBid.lol` : "Pixel Block — PixelsBid.lol",
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
    <div className="mx-auto max-w-[1100px] px-4 py-8">
      <Link href="/" className="text-sm font-bold hover:underline">← Back to canvas</Link>
      <div className="mt-4 grid lg:grid-cols-[520px_1fr] gap-8">
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="aspect-square bg-zinc-100 grid place-items-center overflow-hidden">
            {b.imageUrl ? (
              <img src={b.imageUrl} alt={b.title || ""} className="w-full h-full object-cover" />
            ) : (
              <div className="text-zinc-400 text-sm">Under review — your ad will appear shortly after approval</div>
            )}
          </div>
          <div className="p-4 flex items-center justify-between text-xs">
            <span className="bg-zinc-900 text-white px-2 py-1 rounded-full font-bold">{b.size}×{b.size} · {b.size*b.size} pixels</span>
            <span className={`px-2 py-1 rounded-full font-bold border ${b.status==="active" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : b.status==="pending_review" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-zinc-100 border-zinc-200"}`}>{b.status === "pending_review" ? "under review" : b.status}</span>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight">{b.title || "Untitled block"}</h1>
          <div className="mt-2 text-sm text-zinc-600 break-all">{b.targetUrl || "Link will appear after approval"}</div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="bg-white border border-zinc-200 rounded-full px-3 py-1.5">📍 {b.x}, {b.y}</span>
            <span className="bg-white border border-zinc-200 rounded-full px-3 py-1.5">💰 {formatCents(b.priceCents)} • $1/pixel</span>
            <span className="bg-white border border-zinc-200 rounded-full px-3 py-1.5">👁 {b.impressions.toLocaleString()} impressions</span>
            <span className="bg-white border border-zinc-200 rounded-full px-3 py-1.5">👆 {b.clicks.toLocaleString()} clicks</span>
            {daysLeft !== null && <span className="bg-amber-100 border border-amber-200 rounded-full px-3 py-1.5">⏳ {daysLeft} days left</span>}
          </div>

          <a href={`/api/blocks/click?id=${b.id}`} className="mt-6 inline-flex bg-[#ff3b30] text-white rounded-full px-6 py-3 font-black hover:bg-[#e5352c]">Visit {b.title || "site"} →</a>

          <div className="mt-6 bg-white border border-zinc-200 rounded-2xl p-4 text-sm leading-relaxed">
            <div className="font-bold">About this block</div>
            <p className="text-zinc-600 mt-1">
              This {b.size}×{b.size} square occupies {b.size*b.size} pixel-units on the 1000×1000 PixelsBid canvas.
              It was rented for 30 days and is tracked for clicks and impressions — spatial ownership you can see and click.
            </p>
            <div className="mt-3 text-xs text-zinc-500">Block ID: {b.id} · Rented: {b.rentedAt ? new Date(b.rentedAt).toLocaleDateString() : "—"} · Expires: {b.expiresAt ? new Date(b.expiresAt).toLocaleDateString() : "—"} · Category: {(b as unknown as { category: string }).category || "—"}</div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="bg-white border border-zinc-200 rounded-xl p-3">
              <div className="text-2xl font-black">{b.clicks}</div><div className="text-xs text-zinc-500">Clicks</div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-3">
              <div className="text-2xl font-black">{b.size*b.size}</div><div className="text-xs text-zinc-500">Pixels</div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-3">
              <div className="text-2xl font-black">{formatCents(b.priceCents)}</div><div className="text-xs text-zinc-500">Paid</div>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Link href="/dashboard" className="border border-zinc-200 bg-white rounded-full px-4 py-2 font-bold hover:bg-zinc-50">Manage in dashboard</Link>
            <Link href="/" className="bg-zinc-900 text-white rounded-full px-4 py-2 font-bold hover:bg-black">Rent another square</Link>
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
