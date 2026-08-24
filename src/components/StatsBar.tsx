"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/utils";

type Stats = {
  totalBlocks: number;
  used: number;
  pct: string;
  revenueCents: number;
  visitors: number;
  liveViewers: number;
};

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const r = await fetch("/api/stats", { cache: "no-store" });
        const j = await r.json();
        setStats(j);
      } catch {}
    };
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => clearInterval(id);
  }, []);

  if (!stats) {
    return <div className="h-[36px] bg-zinc-900 text-white text-xs flex items-center justify-center animate-pulse">Loading live stats…</div>;
  }

  return (
    <div className="bg-zinc-900 text-white text-xs sm:text-sm flex flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2 border-b border-zinc-800">
      <span className="inline-flex items-center gap-2"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> <b>{stats.liveViewers}</b> viewing now</span>
      <span className="opacity-80">{stats.visitors.toLocaleString()} visitors since launch</span>
      <span><b>{stats.totalBlocks}</b> blocks rented</span>
      <span><b>{stats.pct}%</b> canvas filled</span>
      <span className="font-bold text-[#ff3b30]">{formatCents(stats.revenueCents)} raised</span>
      <span className="hidden sm:inline opacity-60">· 1000×1000 pixels · $1 / 10×10 block</span>
    </div>
  );
}
