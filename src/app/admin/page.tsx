"use client";
import { useEffect, useState } from "react";
import { formatCents } from "@/lib/utils";

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
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filter, setFilter] = useState<"pending_review" | "active" | "all" | "expired">("pending_review");
  const [loading, setLoading] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const getHeaders = (): HeadersInit => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (adminSecret) {
      headers["Authorization"] = `Bearer ${adminSecret}`;
    }
    return headers;
  };

  const load = async () => {
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

  useEffect(() => {
    load();
  }, []);

  const triggerSweep = async () => {
    try {
      const r = await fetch("/api/cron/sweep", { headers: getHeaders() });
      const j = await r.json();
      if (r.ok) {
        setStatusMsg({
          text: `Sweep complete! Expired reservations: ${j.expiredReservations ?? j.expired ?? 0}, Expired leases: ${j.expiredLeases ?? 0}`,
          type: "success",
        });
        load();
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
        setStatusMsg({ text: `Block ${action === "approve" ? "approved" : "rejected"} successfully`, type: "success" });
        load();
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
        load();
      } else {
        setStatusMsg({ text: j.error || "Failed to remove block", type: "error" });
      }
    } catch (e) {
      setStatusMsg({ text: e instanceof Error ? e.message : "Delete request failed", type: "error" });
    }
  };

  const filtered = filter === "all" ? blocks : blocks.filter(b => b.status === filter);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Admin Moderation & Operations</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Real-time management for pixel block moderation, live lease controls, and database sweep operations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="password"
            placeholder="Admin Secret (if set)"
            value={adminSecret}
            onChange={e => setAdminSecret(e.target.value)}
            className="border border-zinc-200 rounded-full px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 w-[180px]"
          />
          <button
            onClick={triggerSweep}
            className="border border-zinc-200 bg-white rounded-full px-4 py-2 text-xs font-bold hover:bg-zinc-50"
          >
            🧹 Run Sweep Now
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="bg-zinc-900 text-white rounded-full px-4 py-2 text-xs font-bold hover:bg-black disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`mt-4 rounded-xl p-3 text-sm flex items-center justify-between ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs font-bold opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {(["pending_review", "active", "all", "expired"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full border capitalize font-medium ${
              filter === f ? "bg-zinc-900 text-white border-zinc-900" : "bg-white border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {f.replace("_", " ")} ({blocks.filter(b => f === "all" ? true : b.status === f).length})
          </button>
        ))}
      </div>

      <div className="mt-6 bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-widest text-zinc-500">
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
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-zinc-50 transition">
                  <td className="px-4 py-3 flex items-center gap-3">
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt="" className="w-10 h-10 rounded object-cover border border-zinc-200" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-zinc-100 grid place-items-center text-xs font-bold text-zinc-400">
                        PX
                      </div>
                    )}
                    <div>
                      <div className="font-bold truncate max-w-[200px]">{b.title || "Untitled block"}</div>
                      <div className="text-xs text-zinc-500 truncate max-w-[200px]">
                        {b.targetUrl ? (
                          <a href={b.targetUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
                            {b.targetUrl}
                          </a>
                        ) : "No link"}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {b.x},{b.y} · {b.size}×{b.size} ({b.size * b.size} px)
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatCents(b.priceCents)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.clicks.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
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
                          className="bg-emerald-600 text-white rounded-full px-3 py-1 text-xs font-bold hover:bg-emerald-700 shadow-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => moderate(b.id, "reject")}
                          className="bg-red-600 text-white rounded-full px-3 py-1 text-xs font-bold hover:bg-red-700 shadow-sm"
                        >
                          Reject & refund
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
                  <td colSpan={6} className="text-center py-12 text-zinc-500">
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

