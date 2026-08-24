"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/utils";

type Block = { id:string; x:number; y:number; size:number; status:string; title:string|null; imageUrl:string|null; targetUrl:string|null; clicks:number; priceCents:number };

export default function AdminPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filter, setFilter] = useState<"pending_review"|"active"|"all">("pending_review");

  const load = async () => {
    const r = await fetch("/api/canvas", { cache:"no-store" });
    const j = await r.json();
    setBlocks(j.blocks);
  };
  useEffect(()=>{ load(); }, []);

  const moderate = async (id:string, action:"approve"|"reject") => {
    const r = await fetch("/api/admin/moderate", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, action })});
    if (r.ok) load(); else alert("Failed");
  };
  const remove = async (id:string) => {
    if (!confirm("Force remove this block?")) return;
    const r = await fetch(`/api/admin/moderate?id=${id}`, { method:"DELETE" });
    if (r.ok) load();
  };

  const filtered = filter==="all" ? blocks : blocks.filter(b=>b.status===filter);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Admin — Moderation & ops</h1>
          <p className="text-sm text-zinc-600">In production, gate this with role=admin via Better Auth. Demo is open.</p>
        </div>
        <button onClick={load} className="border border-zinc-200 bg-white rounded-full px-4 py-2 font-bold hover:bg-zinc-50">Refresh</button>
      </div>

      <div className="mt-6 flex gap-2 text-sm">
        {(["pending_review","active","all"] as const).map(f=> (
          <button key={f} onClick={()=>setFilter(f)} className={`px-4 py-1.5 rounded-full border capitalize ${filter===f ? "bg-zinc-900 text-white border-zinc-900" : "bg-white border-zinc-200"}`}>{f.replace("_"," ")}</button>
        ))}
      </div>

      <div className="mt-6 bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-widest text-zinc-500">
            <tr><th className="text-left px-4 py-3">Block</th><th className="text-left px-4 py-3">Pos / Size</th><th className="text-left px-4 py-3">Price</th><th className="text-left px-4 py-3">Clicks</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map(b=> (
              <tr key={b.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 flex items-center gap-3">
                  {b.imageUrl ? <img src={b.imageUrl} alt="" className="w-10 h-10 rounded object-cover border" /> : <div className="w-10 h-10 rounded bg-zinc-100 grid place-items-center text-xs">?</div>}
                  <div><div className="font-bold truncate max-w-[200px]">{b.title || "Untitled"}</div><div className="text-xs text-zinc-500 truncate max-w-[200px]">{b.targetUrl}</div></div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{b.x},{b.y} · {b.size}×{b.size}</td>
                <td className="px-4 py-3">{formatCents(b.priceCents)}</td>
                <td className="px-4 py-3">{b.clicks}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold border ${b.status==="active" ? "bg-emerald-50 border-emerald-200" : b.status==="pending_review" ? "bg-amber-50 border-amber-200" : "bg-zinc-100 border-zinc-200"}`}>{b.status}</span></td>
                <td className="px-4 py-3 text-right space-x-2">
                  {b.status==="pending_review" && (
                    <>
                      <button onClick={()=>moderate(b.id,"approve")} className="bg-emerald-600 text-white rounded-full px-3 py-1 text-xs font-bold hover:bg-emerald-700">Approve</button>
                      <button onClick={()=>moderate(b.id,"reject")} className="bg-red-600 text-white rounded-full px-3 py-1 text-xs font-bold hover:bg-red-700">Reject & refund</button>
                    </>
                  )}
                  <button onClick={()=>remove(b.id)} className="border border-zinc-200 bg-white rounded-full px-3 py-1 text-xs font-bold hover:bg-zinc-50">Force remove</button>
                </td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={6} className="text-center py-12 text-zinc-500">No blocks in this filter.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs">
        Root-fix note: this table sweep should also clear leaked reservations every minute via <code>/api/cron/sweep</code> (Vercel Cron). In production, add <code>CRON_SECRET</code> and schedule it.
      </div>
    </div>
  );
}
