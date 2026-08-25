"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth-client";

type Block = {
  id: string;
  x: number;
  y: number;
  size: number;
  status: string;
  ownerId?: string | null;
  title: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
  clicks: number;
  priceCents: number;
  expiresAt: string | null;
};

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const [userBlocks, setUserBlocks] = useState<Block[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "pending_review" | "reserved" | "expired">("all");
  const [loading, setLoading] = useState(true);

  const user = session?.user;

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const loadUserBlocks = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/user/blocks", { cache: "no-store" });
        const data = await res.json();
        if (data.authenticated && Array.isArray(data.blocks)) {
          setUserBlocks(data.blocks);
        } else {
          // Fallback: load canvas and filter by owner_id or email
          const r = await fetch("/api/canvas", { cache: "no-store" });
          const j = await r.json();
          const allBlocks = (j.blocks || []) as Block[];
          setUserBlocks(allBlocks.filter((b) => b.ownerId === user.id));
        }
      } catch (err) {
        console.error("Failed to load user blocks:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserBlocks();
  }, [user, isPending]);

  const renew = async (b: Block) => {
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: b.id,
          title: b.title || "Lease Renewal",
          targetUrl: b.targetUrl || "https://pixelbids.lol",
          imageUrl: b.imageUrl || undefined,
        }),
      });
      const j = await r.json();
      if (r.ok && j.checkoutUrl) {
        window.location.href = j.checkoutUrl;
      } else {
        alert(j.error || "Failed to initiate renewal checkout");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Renewal failed");
    }
  };

  // 1. Loading State
  if (isPending) {
    return (
      <div className="mx-auto max-w-[1150px] px-4 py-20 text-center">
        <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div className="text-sm font-bold text-zinc-500">Checking your session…</div>
      </div>
    );
  }

  // 2. Unauthenticated Gate State — Never leak other users' blocks
  if (!user) {
    return (
      <div className="mx-auto max-w-[560px] px-4 py-16 sm:py-24">
        <div className="bg-white border border-zinc-200/90 rounded-3xl p-8 sm:p-10 shadow-xs text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-950 text-white grid place-items-center text-2xl mx-auto mb-5 shadow-sm">
            📊
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
            Sign In to Access Your Dashboard
          </h1>
          <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
            Your personal advertiser dashboard gives you direct control over your live pixel squares, click analytics, and renewal leases.
          </p>

          <div className="mt-8 space-y-3">
            <Link
              href="/sign-in"
              className="w-full bg-[#ff3b30] hover:bg-[#e5352c] text-white rounded-2xl py-3.5 font-bold text-sm transition shadow-md hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              Sign In or Create Account →
            </Link>
            <Link
              href="/"
              className="w-full border border-zinc-200 bg-white hover:bg-zinc-50 rounded-2xl py-3 text-xs font-bold text-zinc-700 transition block"
            >
              ← Return to Live Billboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated Dashboard UI
  const totalClicks = userBlocks.reduce((acc, b) => acc + (b.clicks || 0), 0);
  const activeCount = userBlocks.filter((b) => b.status === "active").length;
  const filtered = filter === "all" ? userBlocks : userBlocks.filter((b) => b.status === filter);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black tracking-tight text-zinc-950">
              Advertiser Dashboard
            </h1>
            <span className="text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200 px-2.5 py-0.5 rounded-full">
              {user.name || user.email}
            </span>
          </div>
          <p className="text-sm text-zinc-600 mt-1">
            Manage your active billboard squares, view live click metrics, and renew your 30-day spots.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/#canvas-section"
            className="bg-[#ff3b30] hover:bg-[#e5352c] text-white rounded-full px-5 py-2.5 text-xs font-bold transition shadow-xs"
          >
            + Claim New Square
          </Link>
          <button
            onClick={() => signOut()}
            className="border border-zinc-200 bg-white hover:bg-zinc-50 rounded-full px-4 py-2.5 text-xs font-bold text-zinc-700 transition shadow-2xs"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Squares</div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">{activeCount}</div>
        </div>

        <div className="bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Clicks Tracked</div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">{totalClicks.toLocaleString()}</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-zinc-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Squares Claimed</div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-950 mt-1">{userBlocks.length}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-8 flex flex-wrap gap-2 text-xs">
        {(["all", "active", "pending_review", "reserved", "expired"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full border capitalize font-bold transition ${
              filter === f
                ? "bg-zinc-950 text-white border-zinc-950 shadow-2xs"
                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {f.replace("_", " ")} ({userBlocks.filter((b) => (f === "all" ? true : b.status === f)).length})
          </button>
        ))}
      </div>

      {/* Blocks Grid or Empty State */}
      {loading ? (
        <div className="mt-12 text-center py-12 text-zinc-400 font-bold">Loading your active squares…</div>
      ) : filtered.length > 0 ? (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => {
            const daysLeft = b.expiresAt
              ? Math.max(0, Math.ceil((new Date(b.expiresAt).getTime() - Date.now()) / 86400000))
              : null;

            return (
              <div
                key={b.id}
                className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div className="aspect-[1.8] bg-zinc-100 overflow-hidden relative">
                  {b.imageUrl ? (
                    <img src={b.imageUrl} alt="" className="w-full h-full object-contain p-4 bg-white" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-zinc-400 text-xs font-bold">
                      No Image Set
                    </div>
                  )}
                  <span className="absolute top-3 right-3 bg-zinc-950 text-white text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                    {b.size}×{b.size} px
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-base text-zinc-950 truncate">
                      {b.title || "Untitled Block"}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
                      <span>📍 ({b.x}, {b.y})</span>
                      <span>•</span>
                      <span>💰 {formatCents(b.priceCents)}</span>
                      <span>•</span>
                      <span><b>{b.clicks}</b> clicks</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          b.status === "active"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : b.status === "pending_review"
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-zinc-100 border-zinc-200 text-zinc-600"
                        }`}
                      >
                        {b.status.replace("_", " ")}
                      </span>

                      {daysLeft !== null && b.status === "active" && (
                        <span className={`text-xs font-bold ${daysLeft <= 5 ? "text-red-600" : "text-amber-700"}`}>
                          ⏳ {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2 pt-3 border-t border-zinc-100">
                    <Link
                      href={`/block/${encodeURIComponent(b.id)}`}
                      className="flex-1 text-center border border-zinc-200 rounded-full py-2 text-xs font-bold hover:bg-zinc-50 transition"
                    >
                      View Block
                    </Link>
                    {b.status === "active" && (
                      <button
                        onClick={() => renew(b)}
                        className="flex-1 bg-zinc-950 text-white rounded-full py-2 text-xs font-bold hover:bg-black transition shadow-2xs"
                      >
                        Renew Lease
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-10 text-center py-16 bg-white border border-zinc-200/90 rounded-3xl p-8 shadow-xs">
          <div className="text-4xl mb-2">🎯</div>
          <h3 className="text-lg font-black text-zinc-950">You haven&apos;t claimed any squares yet</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Claim a spot on the 1000×1000 live billboard to start driving traffic to your project and get ranked on the leaderboard.
          </p>
          <Link
            href="/#canvas-section"
            className="mt-5 inline-block bg-[#ff3b30] hover:bg-[#e5352c] text-white rounded-full px-6 py-2.5 text-xs font-bold transition shadow-xs"
          >
            Claim Your First Square →
          </Link>
        </div>
      )}
    </div>
  );
}
