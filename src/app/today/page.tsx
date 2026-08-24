"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

type TodayBlock = {
  id: string;
  x: number;
  y: number;
  size: number;
  title: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
  status: string;
  clicks: number;
  priceCents: number;
  category: string | null;
  rentedAt?: string | null;
};

export default function TodayPage() {
  const [blocks, setBlocks] = useState<TodayBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [countdown, setCountdown] = useState("");
  const [showOutbidModal, setShowOutbidModal] = useState(false);
  const [outbidForm, setOutbidForm] = useState({
    title: "",
    targetUrl: "",
    imageUrl: "",
    category: "AI",
    size: 20,
  });
  const [submitting, setSubmitting] = useState(false);

  // Live 24-hour UTC midnight countdown
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diff = nextMidnight.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("00:00:00 (Resetting)");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(
          `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        );
      }
    };

    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch live blocks
  const load = async () => {
    try {
      const res = await fetch("/api/canvas", { cache: "no-store" });
      const data = await res.json();
      setBlocks(data.blocks || []);
    } catch (e) {
      console.error("Failed to load today's leaderboard", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 7000);
    return () => clearInterval(id);
  }, []);

  const activeBlocks = blocks.filter((b) => b.status === "active");
  const filteredBlocks =
    selectedCategory === "all"
      ? activeBlocks
      : activeBlocks.filter(
          (b) => (b.category || "AI").toLowerCase() === selectedCategory.toLowerCase()
        );

  const sortedRows = [...filteredBlocks].sort(
    (a, b) => b.size - a.size || b.priceCents - a.priceCents || b.clicks - a.clicks
  );

  const topLeader = sortedRows[0];
  const minOutbidSize = topLeader ? Math.min(100, topLeader.size + 10) : 10;
  const minOutbidUnits = Math.max(1, Math.round(Math.pow(minOutbidSize / 10, 2)));
  const minOutbidCostCents = minOutbidUnits * 100;

  const handleStartOutbid = (suggestedSize?: number) => {
    const size = suggestedSize || minOutbidSize;
    setOutbidForm((f) => ({ ...f, size }));
    setShowOutbidModal(true);
  };

  const handleOutbidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outbidForm.title.trim()) {
      alert("Please enter your project name.");
      return;
    }
    if (!outbidForm.targetUrl.trim()) {
      alert("Please enter a destination URL.");
      return;
    }

    setSubmitting(true);
    try {
      // Find open slot snapped to 10px
      const x = Math.floor(Math.random() * (100 - outbidForm.size / 10)) * 10;
      const y = Math.floor(Math.random() * (100 - outbidForm.size / 10)) * 10;

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x,
          y,
          size: outbidForm.size,
          userId: "anon",
          title: outbidForm.title,
          targetUrl: outbidForm.targetUrl,
          imageUrl: outbidForm.imageUrl,
          category: outbidForm.category,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reserve spot");
      window.location.href = `/rent/${encodeURIComponent(data.id)}`;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Outbid reservation failed");
      setSubmitting(false);
    }
  };

  const categories = [
    { id: "all", label: "All Niches" },
    { id: "AI", label: "AI & Machine Learning" },
    { id: "SaaS", label: "SaaS & Software" },
    { id: "DevTools", label: "Developer Tools & APIs" },
    { id: "Marketing", label: "Marketing, SEO & Growth" },
    { id: "Design", label: "Design & Creative Tools" },
    { id: "Fintech", label: "Fintech, Crypto & Web3" },
    { id: "Productivity", label: "Productivity & Workflow" },
    { id: "Ecommerce", label: "E-commerce & D2C Brands" },
    { id: "NoCode", label: "No-Code & Automation" },
    { id: "Security", label: "Cybersecurity & Privacy" },
    { id: "Media", label: "Media & Newsletters" },
    { id: "Community", label: "Community & Social" },
    { id: "Other", label: "Other / Launch" },
  ];

  return (
    <div className="mx-auto max-w-[1300px] px-4 py-8">
      {/* Top Banner — 24H Round Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-900 mb-3 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Today&apos;s 24-Hour Bidding Round</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-950">
            Today on <span className="text-[#ff3b30]">PixelsBid</span>
          </h1>

          <p className="mt-2 text-sm sm:text-base text-zinc-600 max-w-2xl leading-relaxed">
            The live pay-to-rank billboard for today. Outbid the current #1 to take the top spotlight and capture live clicks. $1.00 per 10×10 block unit.
          </p>
        </div>

        {/* Live Countdown Clock */}
        <div className="flex flex-col items-start md:items-end gap-2 bg-zinc-950 text-white rounded-2xl p-4 sm:p-5 shrink-0 shadow-md border border-zinc-800">
          <div className="text-[11px] uppercase tracking-widest text-zinc-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Round Resets In
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-amber-400">
            {countdown || "Calculating…"}
          </div>
          <div className="text-[10px] text-zinc-400">Resets daily at 00:00 UTC</div>
        </div>
      </div>

      {/* Hero Spotlight: Today's #1 Leader */}
      <div className="mt-8 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-zinc-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800 border-2 border-amber-400/80 p-2 flex items-center justify-center shrink-0 shadow-lg relative">
              <span className="absolute -top-2.5 -right-2.5 bg-amber-400 text-zinc-950 font-black text-xs px-2 py-0.5 rounded-full shadow">
                #1
              </span>
              {topLeader?.imageUrl ? (
                <img
                  src={topLeader.imageUrl}
                  alt={topLeader.title || ""}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-2xl font-black text-amber-400">👑</span>
              )}
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
                <span>★</span> Today&apos;s King of the Board
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                {topLeader?.title || "Spot Open — Claim #1 Now"}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                {topLeader?.targetUrl && (
                  <a
                    href={`/api/blocks/click?id=${encodeURIComponent(topLeader.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-300 hover:underline font-mono truncate max-w-[200px]"
                  >
                    {topLeader.targetUrl.replace(/^https?:\/\//, "")}
                  </a>
                )}
                <span>•</span>
                <span>
                  {topLeader ? `${topLeader.size}×${topLeader.size} (${Math.round((topLeader.size * topLeader.size) / 100)} blocks)` : "0 blocks"}
                </span>
                <span>•</span>
                <span className="font-mono text-zinc-300">
                  {topLeader ? formatCents(topLeader.priceCents) : "$0.00"} paid
                </span>
              </div>
            </div>
          </div>

          {/* Outbid Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => handleStartOutbid(minOutbidSize)}
              className="bg-[#ff3b30] hover:bg-[#e5352c] text-white px-7 py-3.5 rounded-full font-black text-sm transition shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>⚡ Outbid #1 for {formatCents(minOutbidCostCents)}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-mono">
                {minOutbidSize}×{minOutbidSize}
              </span>
            </button>
            <Link
              href="/#canvas-section"
              className="border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3.5 rounded-full font-bold text-sm text-center transition"
            >
              View on Canvas
            </Link>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition border ${
              selectedCategory === cat.id
                ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Today's Leaderboard Grid */}
      <div className="mt-6 bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="font-black text-sm text-zinc-900">
            Today&apos;s Active Bidders ({sortedRows.length})
          </div>
          <div className="text-xs text-zinc-500 font-mono">
            Ranked by Physical Block Dimensions
          </div>
        </div>

        <div className="divide-y divide-zinc-100">
          {sortedRows.map((r, idx) => {
            const rankStyle =
              idx === 0
                ? "bg-amber-400 text-zinc-950 font-black"
                : idx === 1
                ? "bg-zinc-300 text-zinc-900 font-black"
                : idx === 2
                ? "bg-amber-700 text-white font-black"
                : "bg-zinc-100 text-zinc-600 font-bold";

            const nextOutbidSize = Math.min(100, r.size + 10);
            const nextOutbidPrice =
              Math.max(1, Math.round(Math.pow(nextOutbidSize / 10, 2))) * 100;
            const blocksCount = Math.round((r.size * r.size) / 100);

            return (
              <div
                key={r.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/70 transition"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Rank Badge */}
                  <span
                    className={`w-8 h-8 rounded-full grid place-items-center text-xs shrink-0 ${rankStyle}`}
                  >
                    #{idx + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-2xl border border-zinc-200 bg-white p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                    {r.imageUrl ? (
                      <img
                        src={r.imageUrl}
                        alt={r.title || ""}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-sm font-black text-zinc-700">
                        {(r.title || "PX").slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/block/${encodeURIComponent(r.id)}`}
                        className="font-black text-base text-zinc-900 hover:text-red-600 transition truncate"
                      >
                        {r.title || "Untitled Project"}
                      </Link>
                      <span className="text-[10px] bg-zinc-900 text-white px-2 py-0.5 rounded-full font-mono font-bold shrink-0">
                        {r.size}×{r.size}
                      </span>
                      {r.category && (
                        <span className="text-[10px] bg-zinc-100 text-zinc-600 border border-zinc-200 px-2 py-0.5 rounded-full shrink-0">
                          {r.category}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-2 mt-1">
                      {r.targetUrl && (
                        <a
                          href={`/api/blocks/click?id=${encodeURIComponent(r.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-700 hover:text-red-600 underline truncate max-w-[220px]"
                        >
                          {r.targetUrl.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                      <span>•</span>
                      <span>{r.clicks.toLocaleString()} clicks</span>
                      <span>•</span>
                      <span>📍 ({r.x}, {r.y})</span>
                    </div>
                  </div>
                </div>

                {/* Pricing & Outbid Button */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                  <div className="text-left sm:text-right">
                    <div className="font-mono font-black text-base text-zinc-900">
                      {formatCents(r.priceCents)}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {blocksCount} block{blocksCount > 1 ? "s" : ""} ($1/100px)
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartOutbid(nextOutbidSize)}
                    className="bg-zinc-950 hover:bg-black text-white px-4 py-2 rounded-full text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <span>Outbid</span>
                    <span className="text-amber-400 font-mono">
                      {formatCents(nextOutbidPrice)}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}

          {sortedRows.length === 0 && !loading && (
            <div className="py-16 text-center text-zinc-500">
              <div className="text-3xl mb-2">🏁</div>
              <div className="font-bold text-base text-zinc-800">
                No active bidders yet today!
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Be the first to claim a square and lock #1 for the day.
              </p>
              <button
                onClick={() => handleStartOutbid(10)}
                className="mt-4 bg-[#ff3b30] text-white px-6 py-2.5 rounded-full text-xs font-bold hover:bg-[#e5352c] transition shadow-xs"
              >
                Claim #1 for $1.00 →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Instant Outbid Modal */}
      {showOutbidModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-lg text-zinc-950">
                  ⚡ Outbid Today&apos;s Board
                </h3>
                <p className="text-xs text-zinc-500">
                  Instant live placement with 30-day lease
                </p>
              </div>
              <button
                onClick={() => setShowOutbidModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 grid place-items-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOutbidSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Square Dimension
                </label>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  {[10, 20, 30, 50].map((s) => {
                    const cost =
                      Math.max(1, Math.round(Math.pow(s / 10, 2))) * 100;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setOutbidForm({ ...outbidForm, size: s })
                        }
                        className={`p-2 rounded-xl border text-center transition text-xs ${
                          outbidForm.size === s
                            ? "bg-zinc-950 text-white border-zinc-950 font-black shadow-xs ring-2 ring-red-500"
                            : "bg-zinc-50 border-zinc-200 text-zinc-800 font-bold hover:bg-zinc-100"
                        }`}
                      >
                        <div>{s}×{s}</div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            outbidForm.size === s ? "text-amber-400" : "text-zinc-500"
                          }`}
                        >
                          {formatCents(cost)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Project or Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={outbidForm.title}
                  onChange={(e) =>
                    setOutbidForm({ ...outbidForm, title: e.target.value })
                  }
                  placeholder="e.g. Acme AI"
                  className="mt-1 w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-zinc-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Destination URL
                </label>
                <input
                  type="url"
                  required
                  value={outbidForm.targetUrl}
                  onChange={(e) =>
                    setOutbidForm({ ...outbidForm, targetUrl: e.target.value })
                  }
                  placeholder="https://yourwebsite.com"
                  className="mt-1 w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-zinc-50"
                />
              </div>

              {/* Logo Asset Upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-800">
                    Logo / Brand Asset
                  </label>
                  <span className="text-[11px] text-zinc-400">PNG, JPG, SVG (&lt;2MB)</span>
                </div>

                {outbidForm.imageUrl ? (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-2.5 flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={outbidForm.imageUrl}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-zinc-900 truncate">
                        Logo ready
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate">
                        Attached for live grid render
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOutbidForm({ ...outbidForm, imageUrl: "" })}
                      className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-2.5 py-1 rounded-lg transition"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50 rounded-xl p-3 cursor-pointer transition text-center">
                      <span className="text-xs font-bold text-zinc-700">
                        📁 Click to upload logo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            alert("Please upload an image smaller than 2MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === "string") {
                              setOutbidForm((f) => ({
                                ...f,
                                imageUrl: reader.result as string,
                              }));
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      value={outbidForm.imageUrl}
                      onChange={(e) =>
                        setOutbidForm({ ...outbidForm, imageUrl: e.target.value })
                      }
                      placeholder="or paste logo URL (https://...)"
                      className="w-full border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 bg-zinc-50 focus:bg-white focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  Category
                </label>
                <select
                  value={outbidForm.category}
                  onChange={(e) =>
                    setOutbidForm({ ...outbidForm, category: e.target.value })
                  }
                  className="mt-1 w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm bg-zinc-50 focus:outline-none"
                >
                  <option value="AI">AI & Machine Learning</option>
                  <option value="SaaS">SaaS & Software</option>
                  <option value="DevTools">Developer Tools</option>
                  <option value="Marketing">Marketing & SEO</option>
                  <option value="Fintech">Fintech & Web3</option>
                  <option value="Design">Design & Creative</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#ff3b30] hover:bg-[#e5352c] text-white py-3.5 rounded-full font-black text-base transition shadow-md disabled:opacity-50"
                >
                  {submitting
                    ? "Locking Spot…"
                    : `Lock & Pay (${formatCents(
                        Math.max(
                          1,
                          Math.round(Math.pow(outbidForm.size / 10, 2))
                        ) * 100
                      )}) →`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
