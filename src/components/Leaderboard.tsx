"use client";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

export type LeaderRow = {
  id: string;
  x: number; y: number; size: number;
  title: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
  clicks: number;
  priceCents: number;
  category: string | null;
};

export default function Leaderboard({ rows }: { rows: LeaderRow[] }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
        <h3 className="font-black tracking-tight flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-400 grid place-items-center text-xs">★</span>
          Biggest Pixels — Leaderboard
        </h3>
        <span className="text-xs bg-zinc-900 text-white px-2 py-1 rounded-full font-bold">{rows.length} live</span>
      </div>
      <div className="max-h-[520px] overflow-auto divide-y divide-zinc-100">
        {rows.map((r, idx) => (
          <Link key={r.id} href={`/block/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50">
            <span className={`w-7 h-7 grid place-items-center rounded-full text-xs font-black ${idx===0 ? "bg-amber-400" : idx===1 ? "bg-zinc-300" : idx===2 ? "bg-amber-700 text-white" : "bg-zinc-100 text-zinc-600"}`}>{idx+1}</span>
            <img src={r.imageUrl || `https://avatar.vercel.sh/${encodeURIComponent(r.title || r.id)}.png`} alt="" className="w-10 h-10 rounded-lg object-cover border border-zinc-200 bg-white" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate flex items-center gap-2">
                {r.title || "Untitled"}
                <span className="text-[10px] bg-zinc-900 text-white px-1.5 py-0.5 rounded">{r.size}×{r.size}</span>
                {r.category && <span className="text-[10px] border border-zinc-200 px-1.5 py-0.5 rounded-full">{r.category}</span>}
              </div>
              <div className="text-xs text-zinc-500 truncate">{r.targetUrl} • {r.x},{r.y} • {r.clicks.toLocaleString()} clicks</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black">{formatCents(r.priceCents)}</div>
              <div className="text-[11px] text-zinc-500">{r.size*r.size} pixels</div>
            </div>
          </Link>
        ))}
        {rows.length===0 && <div className="p-8 text-center text-sm text-zinc-500">No blocks yet — be the first to rent!</div>}
      </div>
      <div className="px-4 py-3 bg-zinc-50 text-xs text-zinc-600 flex items-center justify-between">
        <span>Rank = biggest square wins. Pay $1 per pixel (size²).</span>
        <Link href="/leaderboard" className="font-bold text-zinc-900 hover:underline">View full →</Link>
      </div>
    </div>
  );
}
