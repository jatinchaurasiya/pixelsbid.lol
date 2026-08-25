"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/utils";
import Link from "next/link";

type Block = {
  id: string;
  x: number;
  y: number;
  size: number;
  status: string;
  title: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
  clicks: number;
  priceCents: number;
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminSecretInput, setAdminSecretInput] = useState("");
  const [savedSecret, setSavedSecret] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filter, setFilter] = useState<"pending_review" | "active" | "all" | "expired">("pending_review");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Check sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("pixelsbid_admin_key");
    if (stored) {
      setSavedSecret(stored);
      verifyKey(stored);
    }
  }, []);

  const verifyKey = async (secret: string) => {
    setVerifying(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (res.ok && (data.ok || data.devMode)) {
        setIsAuthenticated(true);
        setSavedSecret(secret);
        sessionStorage.setItem("pixelsbid_admin_key", secret);
        loadBlocks(secret);
      } else {
        setIsAuthenticated(false);
        setAuthError(data.error || "Invalid Admin Master Secret.");
      }
    } catch {
      setAuthError("Failed to connect to verification server.");
    } finally {
      setVerifying(false);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecretInput.trim()) return;
    verifyKey(adminSecretInput.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem("pixelsbid_admin_key");
    setIsAuthenticated(false);
    setSavedSecret("");
    setAdminSecretInput("");
  };

  const getHeaders = (): HeadersInit => {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${savedSecret}`,
    };
  };

  const loadBlocks = async (secretToUse?: string) => {
    setLoading(true);
    try {
      const r = await fetch("/api/canvas", { cache: "no-store" });
      const j = await r.json();
      setBlocks(j.blocks || []);
    } catch {
      setStatusMsg({ text: "Failed to load canvas data", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const triggerSweep = async () => {
    try {
      const r = await fetch("/api/cron/sweep", { headers: getHeaders() });
      const j = await r.json();
      if (r.ok) {
        setStatusMsg({
          text: `Sweep complete! Expired holds swept: ${j.expiredReservations ?? 0}, Expired leases swept: ${j.expiredLeases ?? 0}`,
          type: "success",
        });
        loadBlocks();
      } else {
        setStatusMsg({ text: j.error || "Sweep trigger failed", type: "error" });
      }
    } catch (e) {
      setStatusMsg({ text: e instanceof Error ? e.message : "Sweep error", type: "error" });
    }
  };

  const moderate = async (id: string, action: "approve" | "reject") => {
    try {
      const r = await fetch("/api/admin/moderate", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ id, action }),
      });
      const j = await r.json();
      if (r.ok) {
        setStatusMsg({
          text: `Block ${action === "approve" ? "approved" : "rejected"} successfully`,
          type: "success",
        });
        loadBlocks();
      } else {
        setStatusMsg({ text: j.error || "Moderation action failed", type: "error" });
      }
    } catch (e) {
      setStatusMsg({ text: e instanceof Error ? e.message : "Moderation request failed", type: "error" });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Are you sure you want to permanently force-remove this block from the database?")) return;
    try {
      const r = await fetch(`/api/admin/moderate?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const j = await r.json();
      if (r.ok) {
        setStatusMsg({ text: "Block removed successfully", type: "success" });
        loadBlocks();
      } else {
        setStatusMsg({ text: j.error || "Failed to remove block", type: "error" });
      }
    } catch (e) {
      setStatusMsg({ text: e instanceof Error ? e.message : "Delete request failed", type: "error" });
    }
  };

  // Locked Gate UI if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-[440px] px-4 py-16 sm:py-24">
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white grid place-items-center text-xl mx-auto mb-4 shadow-sm">
            🔒
          </div>
          <h1 className="text-2xl font-black text-zinc-950 tracking-tight">
            Admin Access Required
          </h1>
          <p className="text-xs text-zinc-500 mt-1 mb-6">
            Enter your configured ADMIN_SECRET master key to manage moderation and platform operations.
          </p>

          <form onSubmit={handleAuthSubmit} className="space-y-3 text-left">
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                Master Secret Key
              </label>
              <input
                type="password"
                required
                value={adminSecretInput}
                onChange={(e) => setAdminSecretInput(e.target.value)}
                placeholder="Enter ADMIN_SECRET"
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full bg-zinc-950 hover:bg-black text-white rounded-2xl py-3 font-bold text-sm transition shadow-sm disabled:opacity-50"
            >
              {verifying ? "Verifying Secret…" : "Unlock Admin Panel →"}
            </button>
          </form>

          {authError && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-800">
              {authError}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-zinc-100">
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-900 font-medium">
              ← Return to PixelBids Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filtered = filter === "all" ? blocks : blocks.filter((b) => b.status === filter);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950">
              Admin Moderation & Operations
            </h1>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Authenticated
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 mt-1">
            Real-time management for pixel block moderation, live lease controls, and database sweep operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={triggerSweep}
            className="border border-zinc-200 bg-white rounded-full px-4 py-2 text-xs font-bold hover:bg-zinc-50 transition shadow-2xs"
          >
            🧹 Run Sweep Now
          </button>
          <button
            onClick={() => loadBlocks()}
            disabled={loading}
            className="bg-zinc-900 text-white rounded-full px-4 py-2 text-xs font-bold hover:bg-black transition shadow-2xs disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            onClick={handleLogout}
            className="border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-full px-3.5 py-2 text-xs font-bold transition"
          >
            Lock / Exit
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`mt-4 rounded-2xl p-3.5 text-xs font-bold flex items-center justify-between shadow-2xs ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs font-bold opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        {(["pending_review", "active", "all", "expired"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full border capitalize font-bold transition ${
              filter === f
                ? "bg-zinc-950 text-white border-zinc-950 shadow-2xs"
                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {f.replace("_", " ")} ({blocks.filter((b) => (f === "all" ? true : b.status === f)).length})
          </button>
        ))}
      </div>

      {/* Moderation Table */}
      <div className="mt-6 bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] uppercase tracking-widest text-zinc-500 font-bold">
              <tr>
                <th className="text-left px-4 py-3">Block / Brand</th>
                <th className="text-left px-4 py-3">Position / Size</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3">Clicks</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50/70 transition">
                  <td className="px-4 py-3 flex items-center gap-3">
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt="" className="w-10 h-10 rounded-xl object-contain border border-zinc-200 bg-white" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 grid place-items-center text-xs font-bold text-zinc-400">
                        PX
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-950 truncate max-w-[200px]">
                        {b.title || "Untitled block"}
                      </div>
                      <div className="text-xs text-zinc-500 truncate max-w-[200px]">
                        {b.targetUrl ? (
                          <a href={b.targetUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
                            {b.targetUrl}
                          </a>
                        ) : (
                          "No link"
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">
                    ({b.x},{b.y}) · {b.size}×{b.size} px
                  </td>
                  <td className="px-4 py-3 font-bold font-mono text-zinc-900">
                    {formatCents(b.priceCents)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                    {b.clicks.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        b.status === "active"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : b.status === "pending_review"
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : b.status === "reserved"
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-zinc-100 border-zinc-200 text-zinc-600"
                      }`}
                    >
                      {b.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {b.status === "pending_review" && (
                      <>
                        <button
                          onClick={() => moderate(b.id, "approve")}
                          className="bg-emerald-600 text-white rounded-full px-3 py-1 text-xs font-bold hover:bg-emerald-700 shadow-2xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => moderate(b.id, "reject")}
                          className="bg-red-600 text-white rounded-full px-3 py-1 text-xs font-bold hover:bg-red-700 shadow-2xs"
                        >
                          Reject & Refund
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => remove(b.id)}
                      className="border border-zinc-200 bg-white rounded-full px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-zinc-400">
                    No blocks found in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
