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
      rows = (all.filter(r=>r.status==="active").sort((a,b)=> b.size - a.size || (b.priceCents||0)-(a.priceCents||0)).slice(0,50) as unknown as typeof rows);
    } catch {}
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 grid lg:grid-cols-[1fr_360px] gap-8">
      <div>
        <h1 className="text-3xl font-black">Biggest Pixels — Leaderboard</h1>
        <p className="text-sm text-zinc-600 mt-2">Ranked by <b>square size</b> (size² = pixels owned). Ties broken by price, then earliest. This is the moat vs. pure bid ladders — your rank is visual real estate, not just a number.</p>
        <div className="mt-6">
          <Leaderboard rows={rows as unknown as Parameters<typeof Leaderboard>[0]["rows"]} />
        </div>
      </div>
      <div className="space-y-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-5">
          <h3 className="font-black">How pricing works</h3>
          <div className="mt-2 font-mono text-sm bg-zinc-50 border border-zinc-200 rounded-xl p-3">
            price = size × size × $1<br />
            <span className="text-zinc-500">3×3 = 9 pixels = $9</span><br />
            <span className="text-zinc-500">10×10 = 100 pixels = $100</span><br />
            <span className="text-zinc-500">25×25 = 625 pixels = $625</span>
          </div>
          <Link href="/" className="mt-4 inline-flex w-full justify-center bg-[#ff3b30] text-white rounded-full py-2.5 font-bold hover:bg-[#e5352c]">Rent your square</Link>
        </div>
        <div className="bg-zinc-900 text-white rounded-2xl p-5 text-sm">
          <div className="font-bold">Today vs All-time</div>
          <p className="opacity-80 mt-1">Inspired by outbid.lol&apos;s dual board: we show <b>All-time</b> by size, and you can filter <b>Today&apos;s mints</b> on <Link href="/stats" className="underline">/stats</Link>. Fresh buyers get a daily spotlight without needing to outbid whales.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">
          <div className="font-bold">Want #1?</div>
          <div className="mt-1">Current leader is <b>{rows[0]?.size}×{rows[0]?.size}</b> ({rows[0]?.size ? rows[0].size*rows[0].size : 0} pixels — {rows[0] ? formatCents(rows[0].priceCents) : "$0"}). To take #1 you need size ≥ {(rows[0]?.size||0)+1}.</div>
        </div>
      </div>
    </div>
  );
}
