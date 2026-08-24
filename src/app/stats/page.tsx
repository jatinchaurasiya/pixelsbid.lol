"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/utils";

export default function StatsPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [blocks, setBlocks] = useState<{ date:string; blocks:number; revenue:number }[]>([]);

  useEffect(()=>{
    fetch("/api/stats").then(r=>r.json()).then(setStats);
    // mock historical
    const hist = Array.from({length:14}, (_,i)=>{
      const d = new Date(Date.now() - (13-i)*86400000);
      return { date: d.toISOString().slice(0,10), blocks: 2 + Math.floor(Math.random()*6), revenue: 4000 + Math.floor(Math.random()*15000) };
    });
    setBlocks(hist);
  }, []);

  const s = stats as unknown as { totalBlocks:number; used:number; pct:string; revenueCents:number; visitors:number; liveViewers:number } | null;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8">
      <h1 className="text-3xl font-black">Live stats</h1>
      <p className="text-sm text-zinc-600">Transparency like outbid.lol — every pixel accounted for.</p>

      {s && (
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Blocks rented</div>
            <div className="text-3xl font-black">{s.totalBlocks}</div>
            <div className="text-xs text-zinc-500">active leases</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Canvas filled</div>
            <div className="text-3xl font-black">{s.pct}%</div>
            <div className="text-xs text-zinc-500">{s.used.toLocaleString()} / 1,000,000 pixels</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Revenue</div>
            <div className="text-3xl font-black">{formatCents(s.revenueCents)}</div>
            <div className="text-xs text-zinc-500">gross bookings</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-5">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Live viewers</div>
            <div className="text-3xl font-black">{s.liveViewers}</div>
            <div className="text-xs text-zinc-500">{s.visitors.toLocaleString()} total visitors</div>
          </div>
        </div>
      )}

      <div className="mt-8 bg-white border border-zinc-200 rounded-2xl p-6">
        <h3 className="font-bold">Blocks sold / day (last 14 days)</h3>
        <div className="mt-4 flex items-end gap-1 h-[160px]">
          {blocks.map(b=> (
            <div key={b.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-zinc-900 rounded-t" style={{ height: `${b.blocks*14}px` }} title={`${b.date}: ${b.blocks} blocks`} />
              <div className="text-[10px] text-zinc-500 -rotate-45 mt-2">{b.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-white border border-zinc-200 rounded-2xl p-6">
        <h3 className="font-bold">Revenue / day</h3>
        <div className="mt-4 flex items-end gap-1 h-[160px]">
          {blocks.map(b=> (
            <div key={b.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-[#ff3b30] rounded-t" style={{ height: `${b.revenue/400}px` }} title={`${b.date}: ${formatCents(b.revenue)}`} />
              <div className="text-[10px] text-zinc-500 -rotate-45 mt-2">{b.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
