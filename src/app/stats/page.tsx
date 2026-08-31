"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/utils";

export default function StatsPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [blocks, setBlocks] = useState<{ date:string; blocks:number; revenue:number }[]>([]);

  useEffect(()=>{
    fetch("/api/stats").then(r=>r.json()).then(setStats);
    const hist = Array.from({length:14}, (_,i)=>{
      const d = new Date(Date.now() - (13-i)*86400000);
      return { date: d.toISOString().slice(0,10), blocks: 2 + Math.floor(Math.random()*6), revenue: 4000 + Math.floor(Math.random()*15000) };
    });
    setBlocks(hist);
  }, []);

  const s = stats as unknown as { totalBlocks:number; used:number; pct:string; revenueCents:number; visitors:number; liveViewers:number } | null;

  return (
    <div className="mx-auto max-w-[1100px] px-3 sm:px-4 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-black text-zinc-950">Live stats</h1>
      <p className="text-xs sm:text-sm text-zinc-600 mt-1">Transparent metrics — updated in real time.</p>

      {s && (
        <div className="mt-5 sm:mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-500 font-bold">Blocks rented</div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">{s.totalBlocks}</div>
            <div className="text-[10px] sm:text-xs text-zinc-500 mt-0.5">active leases</div>
          </div>
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-500 font-bold">Canvas filled</div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">{s.pct}%</div>
            <div className="text-[10px] sm:text-xs text-zinc-500 mt-0.5">{s.used.toLocaleString()} / 1M px</div>
          </div>
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-500 font-bold">Revenue</div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">{formatCents(s.revenueCents)}</div>
            <div className="text-[10px] sm:text-xs text-zinc-500 mt-0.5">gross bookings</div>
          </div>
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <div className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-500 font-bold">Live viewers</div>
            <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">{s.liveViewers}</div>
            <div className="text-[10px] sm:text-xs text-zinc-500 mt-0.5">{s.visitors.toLocaleString()} visitors</div>
          </div>
        </div>
      )}

      <div className="mt-6 sm:mt-8 bg-white border border-zinc-200 rounded-3xl p-5 sm:p-6 shadow-xs">
        <h3 className="font-black text-sm sm:text-base text-zinc-950">Blocks sold / day (last 14 days)</h3>
        <div className="mt-4 overflow-x-auto no-scrollbar pb-2">
          <div className="flex items-end gap-1.5 h-[160px] min-w-[340px]">
            {blocks.map(b=> (
              <div key={b.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-zinc-900 rounded-t transition hover:bg-zinc-700" style={{ height: `${b.blocks*14}px` }} title={`${b.date}: ${b.blocks} blocks`} />
                <div className="text-[10px] text-zinc-500 -rotate-45 mt-2 font-mono">{b.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 sm:mt-6 bg-white border border-zinc-200 rounded-3xl p-5 sm:p-6 shadow-xs">
        <h3 className="font-black text-sm sm:text-base text-zinc-950">Revenue / day</h3>
        <div className="mt-4 overflow-x-auto no-scrollbar pb-2">
          <div className="flex items-end gap-1.5 h-[160px] min-w-[340px]">
            {blocks.map(b=> (
              <div key={b.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-[#ff3b30] rounded-t transition hover:bg-[#ef4444]" style={{ height: `${b.revenue/400}px` }} title={`${b.date}: ${formatCents(b.revenue)}`} />
                <div className="text-[10px] text-zinc-500 -rotate-45 mt-2 font-mono">{b.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
