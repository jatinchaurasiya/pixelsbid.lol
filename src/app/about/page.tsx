export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-10">
      <h1 className="text-3xl font-black">About PixelsBid.lol</h1>
      <div className="mt-4 bg-white border border-zinc-200 rounded-2xl p-6 text-sm leading-relaxed">
        <p><b>PixelsBid.lol</b> is a live, rentable pixel canvas — a love letter to the 2005 Million Dollar Homepage, rebuilt for recurring revenue and combined with outbid.lol&apos;s live leaderboard energy.</p>
        <p className="mt-3">We launched on <b>August 24, 2026</b> — the same week outbid.lol went viral. We reverse-engineered what made outbid work (dual leaderboards, hard pricing rules, live social proof, transparent build log, zero friction) and asked: what if that leaderboard was <b>spatial</b> — real squares you can see, own, and click?</p>
        <ul className="mt-4 list-disc pl-5 space-y-1 text-zinc-700">
          <li><b>Launch milestones</b> — live counters for visitors, blocks sold, canvas fill, and revenue.</li>
          <li><b>Why leases not forever?</b> — permanent pixels sell once. Leases renew. That&apos;s how a viral spike becomes a business.</li>
          <li><b>Why Postgres exclusion?</b> — because selling the same pixel twice (even for a second) destroys trust. The DB makes it impossible.</li>
          <li><b>10+ clones appeared for outbid in 24h</b> — a canvas with per-block SEO pages is a harder moat than a scoreboard alone.</li>
        </ul>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="border border-zinc-200 rounded-xl p-3"><div className="text-xl font-black">1000×1000</div><div className="text-xs text-zinc-500">canvas</div></div>
          <div className="border border-zinc-200 rounded-xl p-3"><div className="text-xl font-black">$1 / pixel</div><div className="text-xs text-zinc-500">size² pricing</div></div>
          <div className="border border-zinc-200 rounded-xl p-3"><div className="text-xl font-black">30 days</div><div className="text-xs text-zinc-500">lease</div></div>
        </div>
        <p className="mt-6 text-zinc-500">Stack: Next.js 15 · Tailwind · Drizzle · Neon Postgres · Better Auth · Dodo Payments · Vercel. Built as a single stateless Docker image if you ever need to scale to an ALB+ASG.</p>
      </div>
    </div>
  );
}
