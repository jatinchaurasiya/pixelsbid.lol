import Leaderboard from "@/components/Leaderboard";
import { mockStore } from "@/lib/mock-store";
import { getDb } from "@/db";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  let rows: Awaited<ReturnType<typeof mockStore.leaderboard>> = mockStore.leaderboard();
  const db = getDb();
  if (db) {
    try {
      const { pixelBlocks } = await import("@/db/schema");
      const all = await db.select().from(pixelBlocks);
      rows = (all
        .filter((r) => r.status === "active")
        .sort((a, b) => b.size - a.size || (b.priceCents || 0) - (a.priceCents || 0))
        .slice(0, 50) as unknown as typeof rows);
    } catch {}
  }

  const top1 = rows[0];
  const outbidTargetSize = top1 ? Math.min(100, top1.size + 10) : 10;
  const outbidBlocks = Math.max(1, Math.round(Math.pow(outbidTargetSize / 10, 2)));
  const outbidCostCents = outbidBlocks * 100; // $1.00 per 10x10 block

  return (
    <div className="mx-auto max-w-[1250px] px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Leaderboard & Top Titans</h1>
            <p className="text-sm text-zinc-600 mt-1 max-w-2xl leading-relaxed">
              Real 1,000,000 pixel billboard real estate. Your leaderboard rank is determined directly by your physical square dimensions on{" "}
              <b>pixelbids.lol</b>.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Leaderboard rows={rows as unknown as Parameters<typeof Leaderboard>[0]["rows"]} />
        </div>
      </div>

      <div className="space-y-5">
        {/* Outbid Action Card */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-3xl p-6 shadow-md border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-black">⚡ Outbid Battle</span>
            <span className="bg-white/10 px-2 py-0.5 rounded-full text-[11px] font-mono">Live</span>
          </div>

          <div className="mt-4">
            <div className="text-xs text-zinc-400">Current #1 Billboard Leader</div>
            <div className="text-lg font-black text-white mt-0.5 truncate">
              {top1?.title || "No Leader Yet"}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Holds <b className="text-white">{top1?.size || 0}×{top1?.size || 0}</b> ({top1 ? Math.round(top1.size * top1.size / 100) : 0} blocks) · Paid {top1 ? formatCents(top1.priceCents) : "$0"}
            </div>
          </div>

          <div className="mt-5 p-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs space-y-1.5">
            <div className="flex justify-between text-zinc-300">
              <span>Required Size to Overtake:</span>
              <span className="font-bold text-white">{outbidTargetSize}×{outbidTargetSize}</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>Block Units (10×10):</span>
              <span className="font-bold text-white">{outbidBlocks} block{outbidBlocks > 1 ? "s" : ""}</span>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>Outbid Price ($1/block):</span>
              <span className="font-black text-amber-400 text-sm font-mono">{formatCents(outbidCostCents)}</span>
            </div>
          </div>

          <Link
            href="/#canvas-section"
            className="mt-5 w-full inline-flex justify-center items-center gap-2 bg-[#ff3b30] text-white rounded-full py-3.5 font-black text-sm hover:bg-[#e5352c] transition shadow-sm"
          >
            <span>Claim #1 on Canvas →</span>
          </Link>
        </div>

        {/* Pricing Algorithm Card */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
          <h3 className="font-black text-base">Block Unit Pricing Formula</h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Every 10×10 pixel block (100 pixels) costs exactly <b>$1.00 USD</b> for a 30-day lease:
          </p>

          <div className="mt-3 font-mono text-xs bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-1 text-zinc-800">
            <div className="font-black text-zinc-950">Price = (size / 10)² × $1.00</div>
            <div className="text-zinc-500 pt-1">• 10×10 = 1 block = $1.00</div>
            <div className="text-zinc-500">• 20×20 = 4 blocks = $4.00</div>
            <div className="text-zinc-500">• 30×30 = 9 blocks = $9.00</div>
            <div className="text-zinc-500">• 40×40 = 16 blocks = $16.00</div>
            <div className="text-zinc-500">• 50×50 = 25 blocks = $25.00</div>
            <div className="text-zinc-500">• 100×100 = 100 blocks = $100.00</div>
          </div>

          <Link
            href="/#canvas-section"
            className="mt-4 inline-flex w-full justify-center bg-zinc-900 text-white rounded-full py-3 text-xs font-bold hover:bg-black transition"
          >
            Select Any Empty Square
          </Link>
        </div>
      </div>
    </div>
  );
}


