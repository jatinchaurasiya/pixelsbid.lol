"use client";
import { useState } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

export type LeaderRow = {
  id: string;
  x: number;
  y: number;
  size: number;
  title: string | null;
  imageUrl: string | null;
  targetUrl: string | null;
  clicks: number;
  priceCents: number;
  category: string | null;
};

export default function Leaderboard({ rows }: { rows: LeaderRow[] }) {
  const [tab, setTab] = useState<"pixels" | "clicks">("pixels");

  const sortedRows = [...rows].sort((a, b) => {
    if (tab === "pixels") {
      return b.size - a.size || b.priceCents - a.priceCents || b.clicks - a.clicks;
    }
    return b.clicks - a.clicks || b.size - a.size;
  });

  const top1 = sortedRows[0];
  const outbidTargetSize = top1 ? Math.min(100, top1.size + 10) : 10;
  const outbidCost = Math.max(1, Math.round(Math.pow(outbidTargetSize / 10, 2))) * 100; // $1 per 10x10 block

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50">
        <div>
          <h3 className="font-black text-base tracking-tight flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-zinc-900 grid place-items-center text-xs font-black shadow-sm">
              ★
            </span>
            Live Leaderboard
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            1000×1000 Billboard · Rank by Square Dimensions
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-zinc-200/70 p-1 rounded-full text-xs font-bold self-start sm:self-auto">
          <button
            onClick={() => setTab("pixels")}
            className={`px-3 py-1 rounded-full transition ${
              tab === "pixels" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            📐 Area
          </button>
          <button
            onClick={() => setTab("clicks")}
            className={`px-3 py-1 rounded-full transition ${
              tab === "clicks" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            ⚡ Velocity
          </button>
        </div>
      </div>

      {/* Outbid #1 Spotlight Banner */}
      {top1 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-b border-amber-200/60 p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="min-w-0">
            <span className="font-black text-amber-900">👑 #1:</span>{" "}
            <span className="font-bold text-zinc-900 truncate">{top1.title || "Top Block"}</span>{" "}
            <span className="text-zinc-600">({top1.size}×{top1.size} · {Math.round(top1.size * top1.size / 100)}b)</span>
          </div>
          <a
            href="#canvas-section"
            className="self-start sm:self-auto shrink-0 bg-zinc-900 text-white font-black px-3 py-1.5 rounded-full hover:bg-black transition shadow-xs flex items-center gap-1.5 text-[11px]"
          >
            <span>⚡ Outbid #1</span>
            <span className="bg-amber-400 text-zinc-950 px-1.5 py-0.2 rounded text-[10px]">
              {formatCents(outbidCost)}
            </span>
          </a>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="max-h-[500px] overflow-y-auto divide-y divide-zinc-100">
        {sortedRows.map((r, idx) => {
          const rankBadge =
            idx === 0
              ? "bg-amber-400 text-zinc-950 shadow-xs"
              : idx === 1
              ? "bg-zinc-300 text-zinc-900"
              : idx === 2
              ? "bg-amber-700 text-white"
              : "bg-zinc-100 text-zinc-600";

          const hostname = r.targetUrl
            ? r.targetUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
            : "pixelbids.lol";

          const blocksCount = Math.round((r.size * r.size) / 100);

          return (
            <div
              key={r.id}
              className="flex items-center gap-2.5 sm:gap-3 p-3 sm:px-4 sm:py-3 hover:bg-zinc-50/80 transition group"
            >
              {/* Rank */}
              <span className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 grid place-items-center rounded-full text-[11px] sm:text-xs font-black ${rankBadge}`}>
                {idx + 1}
              </span>

              {/* Logo / Thumbnail */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl overflow-hidden border border-zinc-200 bg-white p-1 flex items-center justify-center shadow-xs">
                {r.imageUrl ? (
                  <img
                    src={r.imageUrl}
                    alt={r.title || ""}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-[10px] sm:text-xs font-black text-zinc-700">
                    {(r.title || "PX").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold truncate flex items-center gap-1.5">
                  <Link href={`/block/${encodeURIComponent(r.id)}`} className="hover:underline truncate text-zinc-900">
                    {r.title || "Untitled Block"}
                  </Link>
                  <span className="text-[9px] sm:text-[10px] bg-zinc-900 text-white px-1.5 py-0.5 rounded font-mono shrink-0">
                    {r.size}×{r.size}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 truncate flex items-center gap-1.5 mt-0.5">
                  <a
                    href={`/api/blocks/click?id=${encodeURIComponent(r.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-600 hover:text-red-600 truncate underline decoration-zinc-300 max-w-[120px] sm:max-w-none"
                  >
                    {hostname}
                  </a>
                  <span>•</span>
                  <span>{r.clicks.toLocaleString()} clicks</span>
                </div>
              </div>

              {/* Metrics / Action */}
              <div className="text-right shrink-0">
                <div className="text-xs sm:text-sm font-black text-zinc-900 font-mono">
                  {formatCents(r.priceCents)}
                </div>
                <div className="text-[10px] sm:text-[11px] text-zinc-500">
                  {blocksCount}b
                </div>
              </div>
            </div>
          );
        })}

        {sortedRows.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500">
            No active blocks yet — claim your square on the canvas!
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-100 text-xs text-zinc-600 flex items-center justify-between">
        <span><b>Pricing:</b> $1.00 per 10×10 block.</span>
        <Link href="/leaderboard" className="font-bold text-zinc-900 hover:underline">
          Full Board →
        </Link>
      </div>
    </div>
  );
}

