"use client";
import { useEffect, useState } from "react";
import PixelCanvas, { CanvasBlock } from "@/components/PixelCanvas";
import StatsBar from "@/components/StatsBar";
import Leaderboard from "@/components/Leaderboard";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

type CanvasData = { config: { width: number; height: number; unitPriceCents: number }; blocks: CanvasBlock[] };

export default function HomePage() {
  const [data, setData] = useState<CanvasData | null>(null);
  const [selection, setSelection] = useState<{ x: number; y: number; size: number; priceCents: number } | null>(null);
  const [reserving, setReserving] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    const r = await fetch("/api/canvas", { cache: "no-store" });
    const j = await r.json();
    setData(j);
  };
  useEffect(() => { load(); const id = setInterval(load, 7000); return () => clearInterval(id); }, []);

  const handleSelect = async (sel: { x: number; y: number; size: number; priceCents: number }) => {
    setSelection(sel);
  };

  const confirmReserve = async () => {
    if (!selection) return;
    setReserving(true);
    try {
      const r = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: selection.x, y: selection.y, size: selection.size, userId: "anon" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Reserve failed");
      window.location.href = `/rent/${j.id}`;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to reserve");
    } finally {
      setReserving(false);
    }
  };

  const blocks = data?.blocks || [];
  const categories = [...new Set(blocks.map(b => (b as unknown as { category: string }).category).filter(Boolean))] as string[];
  const filteredBlocks = filter === "all" ? blocks : blocks.filter(b => (b as unknown as { category: string }).category === filter);
  const leaderboardRows = [...blocks].filter(b => b.status === "active").sort((a,b)=> b.size - a.size).slice(0,10).map(b=> ({
    id: b.id, x: b.x, y: b.y, size: b.size, title: b.title, imageUrl: b.imageUrl, targetUrl: b.targetUrl, clicks: b.clicks, priceCents: b.priceCents, category: (b as unknown as { category: string }).category || null
  }));

  return (
    <div>
      <StatsBar />
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none">Rent pixels.<br /><span className="text-[#ff3b30]">Own the canvas.</span></h1>
            <p className="mt-3 text-zinc-600 max-w-xl">A live 1000×1000 canvas. Pick any empty square — price is <b>size² × $1</b> (a 10×10 = 100 pixels = $100). 30-day lease, clicks tracked, biggest squares top the leaderboard. Built for real ownership.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 rounded-full px-3 py-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> No overlap — DB exclusion</span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 rounded-full px-3 py-1.5">⚡ Dodo Payments (global tax)</span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 rounded-full px-3 py-1.5">🛡️ Reviewed before going live</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 min-w-[280px]">
            <div className="bg-zinc-900 text-white rounded-2xl p-4">
              <div className="text-xs uppercase tracking-widest opacity-60">Pricing</div>
              <div className="mt-1 font-mono text-sm leading-relaxed">
                1×1 = $1 · 2×2 = $4 · 5×5 = $25<br />10×10 = $100 · 20×20 = $400 · 50×50 = $2,500
              </div>
              <div className="mt-3 text-xs opacity-70">Lease: 30 days, renewable. 10-minute lock at checkout.</div>
            </div>
            <div className="flex gap-2">
              <Link href="/rules" className="flex-1 text-center border border-zinc-200 bg-white rounded-full px-4 py-2 text-sm font-bold hover:bg-zinc-50">How it works</Link>
              <Link href="/leaderboard" className="flex-1 text-center bg-[#ff3b30] text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-[#e5352c]">Leaderboard ★</Link>
            </div>
          </div>
        </div>
      </div>

      <div id="canvas" className="mx-auto max-w-[1400px] px-4 grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-3 text-xs">
            <span className="font-bold">Filter:</span>
            <button onClick={()=>setFilter("all")} className={`px-3 py-1 rounded-full border ${filter==="all" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white border-zinc-200 hover:bg-zinc-50"}`}>All</button>
            {categories.map(c=> (
              <button key={c} onClick={()=>setFilter(c)} className={`px-3 py-1 rounded-full border capitalize ${filter===c ? "bg-zinc-900 text-white border-zinc-900" : "bg-white border-zinc-200 hover:bg-zinc-50"}`}>{c}</button>
            ))}
          </div>
          {!data ? (
            <div className="aspect-square sm:aspect-[1.15] bg-white border border-zinc-200 rounded-2xl grid place-items-center text-zinc-500">Loading canvas…</div>
          ) : (
            <PixelCanvas blocks={filteredBlocks as unknown as CanvasBlock[]} config={data.config} onSelect={handleSelect} />
          )}
          {selection && (
            <div className="mt-4 bg-white border-2 border-zinc-900 rounded-2xl p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Your selection</div>
                <div className="font-mono font-bold">{selection.x}, {selection.y} · {selection.size}×{selection.size} · {selection.size*selection.size} pixels</div>
                <div className="text-sm">Total: <b>{formatCents(selection.priceCents)}</b> for 30 days</div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setSelection(null)} className="px-4 py-2 rounded-full border border-zinc-200 bg-white font-bold hover:bg-zinc-50">Cancel</button>
                <button onClick={confirmReserve} disabled={reserving} className="px-6 py-2 rounded-full bg-[#ff3b30] text-white font-black hover:bg-[#e5352c] disabled:opacity-50">{reserving? "Reserving…" : "Reserve & Pay →"}</button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Leaderboard rows={leaderboardRows} />
          <div className="bg-white border border-zinc-200 rounded-2xl p-4">
            <h4 className="font-black">Live activity</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {blocks.slice(0,6).map(b=> (
                <li key={b.id} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="truncate flex-1"><b>{b.title || "Someone"}</b> rented {b.size}×{b.size} at {b.x},{b.y}</span>
                  <span className="text-xs text-zinc-500">{formatCents(b.priceCents)}</span>
                </li>
              ))}
              {blocks.length===0 && <li className="text-zinc-500">No activity yet.</li>}
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">
            <div className="font-bold">Why biggest wins?</div>
            <p className="mt-1 text-zinc-700">The leaderboard ranks by <b>size</b> (then price). A 25×25 ($625) outranks ten 5×5s ($25 each). Big squares are instantly visible on the canvas.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 mt-12">
        <h2 className="font-black text-xl">Featured blocks</h2>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {blocks.filter(b=>b.status==="active").slice(0,8).map(b=> (
            <Link key={b.id} href={`/block/${b.id}`} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-md transition">
              <div className="aspect-[1.6] bg-zinc-100 overflow-hidden">
                <img src={b.imageUrl || `https://avatar.vercel.sh/${encodeURIComponent(b.title || b.id)}.png`} alt={b.title || ""} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <div className="font-bold text-sm truncate">{b.title}</div>
                <div className="text-xs text-zinc-500 truncate">{b.targetUrl} • {b.size}×{b.size} • {b.clicks} clicks</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
