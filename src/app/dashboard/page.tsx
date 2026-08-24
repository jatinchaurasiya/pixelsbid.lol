"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";

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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "pending_review" | "reserved" | "expired">("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/canvas", { cache: "no-store" });
      const j = await r.json();
      setBlocks(j.blocks || []);
    } catch {
      console.error("Failed to load dashboard blocks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const user = session?.user;

  // Filter to user's blocks if logged in and user has blocks; otherwise show all
  const userBlocks = user ? blocks.filter(b => b.ownerId === user.id) : [];
  const displaySource = user && userBlocks.length > 0 ? userBlocks : blocks;
  const filtered = filter === "all" ? displaySource : displaySource.filter(b => b.status === filter);

  const renew = async (b: Block) => {
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: b.id,
          title: b.title || "Lease Renewal",
          targetUrl: b.targetUrl || "https://pixelsbid.lol",
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

  return (
    <div className="mx-auto max-w-[1150px] px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Your Dashboard</h1>
          <p className="text-sm text-zinc-600 mt-1">
            {user
              ? `Logged in as ${user.name || user.email}. Manage your active pixel leases, track clicks, and renew.`
              : "Track your rented pixels, view live click metrics, and renew expiring leases."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!user && !isPending && (
            <Link href="/sign-in" className="border border-zinc-200 bg-white rounded-full px-5 py-2.5 text-sm font-bold hover:bg-zinc-50 transition">
              Sign In to Your Account
            </Link>
          )}
          <Link href="/#canvas" className="bg-[#ff3b30] text-white rounded-full px-5 py-2.5 text-sm font-bold hover:bg-[#e5352c] transition shadow-sm">
            + Rent More Pixels
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {(["all", "active", "pending_review", "reserved", "expired"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full border capitalize font-medium transition ${
              filter === f ? "bg-zinc-900 text-white border-zinc-900" : "bg-white border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {f.replace("_", " ")} ({displaySource.filter(b => f === "all" ? true : b.status === f).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-12 text-center py-12 text-zinc-400">Loading dashboard inventory…</div>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(b => {
            const daysLeft = b.expiresAt
              ? Math.max(0, Math.ceil((new Date(b.expiresAt).getTime() - Date.now()) / 86400000))
              : null;
            return (
              <div key={b.id} className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div className="aspect-[1.8] bg-zinc-100 overflow-hidden relative">
                  {b.imageUrl ? (
                    <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-zinc-400 text-xs font-bold">
                      No Image Set
                    </div>
                  )}
                  <span className="absolute top-3 right-3 bg-zinc-900/80 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                    {b.size}×{b.size} ({b.size * b.size} px)
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="font-black text-base truncate">{b.title || "Untitled Block"}</div>
                    <div className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-2">
                      <span>Coord: {b.x},{b.y}</span>
                      <span>•</span>
                      <span>Paid: {formatCents(b.priceCents)}</span>
                      <span>•</span>
                      <span><b>{b.clicks}</b> clicks</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
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
                      View Live Block
                    </Link>
                    {b.status === "active" && (
                      <button
                        onClick={() => renew(b)}
                        className="flex-1 bg-zinc-900 text-white rounded-full py-2 text-xs font-bold hover:bg-black transition shadow-sm"
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
      )}

      {!loading && filtered.length === 0 && (
        <div className="mt-12 text-center py-16 bg-white border border-zinc-200 rounded-3xl p-8">
          <div className="text-4xl">🎨</div>
          <h3 className="mt-3 text-lg font-bold">No blocks found in this view</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
            Select a square on the live canvas to claim your spot and get listed on the leaderboard.
          </p>
          <Link href="/#canvas" className="mt-6 inline-block bg-[#ff3b30] text-white rounded-full px-6 py-2.5 text-sm font-bold hover:bg-[#e5352c] transition">
            Claim Your Square Now
          </Link>
        </div>
      )}
    </div>
  );
}

