"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

type Block = { id:string; x:number; y:number; size:number; status:string; title:string | null; imageUrl:string|null; targetUrl:string|null; clicks:number; priceCents:number; expiresAt:string|null };

export default function DashboardPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filter, setFilter] = useState<"all"|"active"|"pending_review"|"reserved"|"expired">("all");

  const load = async () => {
    const r = await fetch("/api/canvas", { cache: "no-store" });
    const j = await r.json();
    // For demo, show all blocks owned by anon + seeds
    setBlocks(j.blocks);
  };
  useEffect(()=>{ load(); }, []);

  const filtered = filter==="all" ? blocks : blocks.filter(b=>b.status===filter);

  const renew = async (id:string) => {
    const r = await fetch("/api/checkout", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ reservationId: id, title: "Renewal", targetUrl: "https://example.com" }) });
    const j = await r.json();
    if (r.ok) window.location.href = j.checkoutUrl;
    else alert(j.error);
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Your dashboard</h1>
          <p className="text-sm text-zinc-600">Track clicks, impressions, expiry, and renew leases. Demo shows all blocks — in prod filtered by session.</p>
        </div>
        <Link href="/" className="bg-[#ff3b30] text-white rounded-full px-5 py-2.5 font-bold hover:bg-[#e5352c]">Rent more pixels</Link>
      </div>

      <div className="mt-6 flex gap-2 text-sm">
        {(["all","active","pending_review","reserved","expired"] as const).map(f=> (
          <button key={f} onClick={()=>setFilter(f)} className={`px-4 py-1.5 rounded-full border capitalize ${filter===f ? "bg-zinc-900 text-white border-zinc-900" : "bg-white border-zinc-200 hover:bg-zinc-50"}`}>{f.replace("_"," ")}</button>
        ))}
      </div>

      <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(b=> {
          const daysLeft = b.expiresAt ? Math.max(0, Math.ceil((new Date(b.expiresAt).getTime()-Date.now())/86400000)) : null;
          return (
            <div key={b.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <div className="aspect-[1.6] bg-zinc-100 overflow-hidden">
                {b.imageUrl ? <img src={b.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-zinc-400 text-xs">No image</div>}
              </div>
              <div className="p-4">
                <div className="font-bold truncate">{b.title || "Untitled"} <span className="ml-2 text-xs bg-zinc-900 text-white px-1.5 py-0.5 rounded">{b.size}×{b.size}</span></div>
                <div className="text-xs text-zinc-500">{b.x},{b.y} • {formatCents(b.priceCents)} • {b.clicks} clicks • <span className="capitalize">{b.status.replace("_"," ")}</span></div>
                {daysLeft!==null && <div className="mt-2 text-xs font-bold text-amber-700">{daysLeft} days left</div>}
                <div className="mt-3 flex gap-2">
                  <Link href={`/block/${b.id}`} className="flex-1 text-center border border-zinc-200 rounded-full py-1.5 text-sm font-bold hover:bg-zinc-50">View</Link>
                  {b.status==="active" && <button onClick={()=>renew(b.id)} className="flex-1 bg-zinc-900 text-white rounded-full py-1.5 text-sm font-bold hover:bg-black">Renew</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length===0 && <div className="mt-12 text-center text-zinc-500">No blocks in this filter. <Link href="/" className="underline">Go rent one</Link>.</div>}
    </div>
  );
}
