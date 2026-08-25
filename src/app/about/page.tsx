import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-10">
      <h1 className="text-3xl font-black tracking-tight">About PixelBids.lol</h1>
      <div className="mt-4 bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 text-sm leading-relaxed shadow-sm">
        <p className="text-base text-zinc-700 font-medium">
          <b>PixelBids.lol</b> is a live, interactive 1,000,000 pixel billboard combining the timeless spatial real estate of the Million Dollar Homepage with the high-stakes competitive bidding of the viral pay-to-rank movement.
        </p>

        <p className="mt-4 text-zinc-600">
          Traditional directories hide your project behind opaque algorithms and hidden ranking scores. On PixelBids, visibility is direct and transparent: you buy physical pixel real estate on the canvas, your square size determines your leaderboard dominance, and traffic flows straight to your website.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="border border-zinc-200 bg-zinc-50 rounded-2xl p-4">
            <div className="text-2xl font-black text-zinc-900">1,000,000</div>
            <div className="text-xs text-zinc-500 font-bold mt-0.5">Total Pixels</div>
          </div>
          <div className="border border-zinc-200 bg-zinc-50 rounded-2xl p-4">
            <div className="text-2xl font-black text-zinc-900">$1.00</div>
            <div className="text-xs text-zinc-500 font-bold mt-0.5">Per 10×10 Block</div>
          </div>
          <div className="border border-zinc-200 bg-zinc-50 rounded-2xl p-4">
            <div className="text-2xl font-black text-zinc-900">30 Days</div>
            <div className="text-xs text-zinc-500 font-bold mt-0.5">Active Lease</div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-zinc-500">Ready to take the spotlight?</span>
          <Link href="/#canvas-section" className="bg-[#ff3b30] text-white px-6 py-2.5 rounded-full text-xs font-bold hover:bg-[#e5352c] transition">
            Claim Your Spot on the Grid →
          </Link>
        </div>
      </div>
    </div>
  );
}


