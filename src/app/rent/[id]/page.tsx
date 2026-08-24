"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

export default function RentPage() {
  const params = useParams() as { id: string };
  const id = params.id;
  const [block, setBlock] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ title: "", targetUrl: "", imageUrl: "", category: "AI", email: "" });
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("paid")==="1") setPaid(true);
    fetch(`/api/reservations?id=${id}`).then(r=>r.json()).then(setBlock).catch(()=>{});
  }, [id]);

  const checkout = async () => {
    if (!form.title || !form.targetUrl) { alert("Title and target URL required"); return; }
    if (!form.targetUrl.startsWith("http")) { alert("URL must start with https://"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: id, ...form }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Checkout failed");
      window.location.href = j.checkoutUrl;
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Checkout failed"); }
    finally { setLoading(false); }
  };

  if (paid) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-12">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <div className="text-4xl">✓</div>
          <h1 className="mt-2 text-2xl font-black">Payment received!</h1>
          <p className="text-sm text-zinc-600 mt-2">Your block is now under review and will go live on the canvas within minutes.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href={`/block/${id}`} className="bg-zinc-900 text-white rounded-full px-6 py-2.5 font-bold">View your block</Link>
            <Link href="/" className="border border-zinc-200 bg-white rounded-full px-6 py-2.5 font-bold">Back to canvas</Link>
          </div>
        </div>
      </div>
    );
  }

  const b = block as unknown as { x:number; y:number; size:number; priceCents:number; reservationExpiresAt:string } | null;

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 grid md:grid-cols-[1fr_360px] gap-8">
      <div className="bg-white border border-zinc-200 rounded-2xl p-6">
        <h1 className="text-2xl font-black">Complete your rental</h1>
        {b ? (
          <div className="mt-2 text-sm text-zinc-600">Reserved: <b>{b.x},{b.y}</b> · {b.size}×{b.size} · {b.size*b.size} pixels · <b>{formatCents(b.priceCents)}</b> · expires {new Date(b.reservationExpiresAt).toLocaleTimeString()}</div>
        ) : <div className="text-sm text-zinc-500">Loading reservation…</div>}

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-bold">Project / Brand title</label>
            <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Acme AI — Ship faster" className="mt-1 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold">Target URL</label>
            <input value={form.targetUrl} onChange={e=>setForm({...form,targetUrl:e.target.value})} placeholder="https://yourproduct.com" className="mt-1 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold">Image URL</label>
            <input value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} placeholder="https://yourbrand.com/logo.png" className="mt-1 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none" />
            {form.imageUrl && <img src={form.imageUrl} alt="preview" className="mt-2 w-24 h-24 object-cover rounded-xl border border-zinc-200" />}
            <div className="text-xs text-zinc-500 mt-1">Use a square logo — it will be displayed at your exact pixel size on the canvas.</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold">Category</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-1 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm bg-white">
                <option>AI</option><option>Tools</option><option>Design</option><option>DevTools</option><option>Marketing</option><option>Fintech</option><option>Social</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-bold">Email (receipt)</label>
              <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@company.com" className="mt-1 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none" />
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs leading-relaxed">
            <b>Content policy:</b> No sexual content, phishing, malware, or impersonation. Every block is reviewed before going live. Violations are removed with no refund once live.
          </div>

          <button onClick={checkout} disabled={loading || !b} className="w-full bg-[#ff3b30] text-white rounded-full py-3.5 font-black text-lg hover:bg-[#e5352c] disabled:opacity-50">
            {loading ? "Redirecting to checkout…" : `Pay ${b ? formatCents(b.priceCents) : ""} — Secure checkout →`}
          </button>
          <div className="text-xs text-center text-zinc-500">Secure payments via Dodo Payments — merchant of record, global tax included.</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-zinc-900 text-white rounded-2xl p-5">
          <div className="text-xs uppercase tracking-widest opacity-60">Why PixelsBid?</div>
          <ul className="mt-3 text-sm space-y-2 leading-relaxed">
            <li>• <b>10-minute lock</b> — your square is reserved while you pay.</li>
            <li>• <b>No overlap</b> — enforced at the database layer.</li>
            <li>• <b>Reviewed</b> — every ad is checked before it goes live.</li>
            <li>• <b>30-day lease</b> — renew anytime or it returns to the pool.</li>
          </ul>
        </div>
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 text-sm">
          <div className="font-bold">Need a big block?</div>
          <div className="text-zinc-600 mt-1">25×25 = $625, 30×30 = $900, 50×50 = $2,500. Largest squares dominate the leaderboard and the canvas.</div>
        </div>
      </div>
    </div>
  );
}
