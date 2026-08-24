"use client";
import { useEffect, useState } from "react";
import PixelCanvas, { CanvasBlock } from "@/components/PixelCanvas";
import StatsBar from "@/components/StatsBar";
import Leaderboard from "@/components/Leaderboard";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

type CanvasData = {
  config: { width: number; height: number; unitPriceCents: number };
  blocks: CanvasBlock[];
};

type SelectionState = {
  x: number;
  y: number;
  size: number;
  priceCents: number;
};

export default function HomePage() {
  const [data, setData] = useState<CanvasData | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>({
    x: 450,
    y: 450,
    size: 20,
    priceCents: 400, // $4.00 (4 blocks)
  });
  const [form, setForm] = useState({
    title: "",
    targetUrl: "",
    imageUrl: "",
    category: "AI",
    email: "",
  });
  const [reserving, setReserving] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    try {
      const r = await fetch("/api/canvas", { cache: "no-store" });
      const j = await r.json();
      setData(j);
    } catch (e) {
      console.error("Failed to load canvas", e);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, []);

  const handleSelect = (sel: SelectionState | null) => {
    setSelection(sel);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please upload an image smaller than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((f) => ({ ...f, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmReserve = async () => {
    if (!selection) return;
    setReserving(true);
    try {
      const r = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x: selection.x,
          y: selection.y,
          size: selection.size,
          userId: "anon",
          title: form.title,
          targetUrl: form.targetUrl,
          imageUrl: form.imageUrl,
          category: form.category,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Reservation failed");
      window.location.href = `/rent/${encodeURIComponent(j.id)}`;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to reserve square");
    } finally {
      setReserving(false);
    }
  };

  const blocks = data?.blocks || [];
  const activeBlocks = blocks.filter((b) => b.status === "active");
  const categories = [
    ...new Set(
      activeBlocks
        .map((b) => (b as unknown as { category: string }).category)
        .filter(Boolean)
    ),
  ] as string[];
  const filteredBlocks =
    filter === "all"
      ? activeBlocks
      : activeBlocks.filter(
          (b) => (b as unknown as { category: string }).category === filter
        );

  const leaderboardRows = [...activeBlocks]
    .sort((a, b) => b.size - a.size || b.clicks - a.clicks)
    .slice(0, 10)
    .map((b) => ({
      id: b.id,
      x: b.x,
      y: b.y,
      size: b.size,
      title: b.title,
      imageUrl: b.imageUrl,
      targetUrl: b.targetUrl,
      clicks: b.clicks,
      priceCents: b.priceCents,
      category: (b as unknown as { category: string }).category || null,
    }));

  const selectedUnits = selection
    ? Math.max(1, Math.round((selection.size / 10) * (selection.size / 10)))
    : 1;

  const [heroUrl, setHeroUrl] = useState("");
  const [heroCategory, setHeroCategory] = useState("AI");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleHeroOutbid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroUrl.trim()) return;

    let target = heroUrl.trim();
    let title = target;

    if (target.startsWith("@")) {
      const handle = target.replace(/^@/, "");
      target = `https://x.com/${handle}`;
      title = `@${handle}`;
    } else if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `https://${target}`;
      try {
        title = new URL(target).hostname.replace(/^www\./, "");
      } catch {
        title = target;
      }
    } else {
      try {
        title = new URL(target).hostname.replace(/^www\./, "");
      } catch {
        title = target;
      }
    }

    setReserving(true);
    try {
      const size = selection?.size || 20;
      const x = selection?.x ?? Math.floor(Math.random() * (100 - size / 10)) * 10;
      const y = selection?.y ?? Math.floor(Math.random() * (100 - size / 10)) * 10;

      const r = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x,
          y,
          size,
          userId: "anon",
          title: form.title.trim() || title,
          targetUrl: target,
          imageUrl: form.imageUrl.trim() || undefined,
          category: heroCategory,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Reservation failed");
      window.location.href = `/rent/${encodeURIComponent(j.id)}`;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to claim square");
      setReserving(false);
    }
  };

  return (
    <div className="pb-28">
      <StatsBar />

      {/* Hero Section — Minimalist Outbid Style */}
      <section className="mx-auto max-w-[1200px] px-4 pt-12 pb-10 text-center sm:pt-16 sm:pb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-bold text-zinc-700 shadow-2xs mb-5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>1000×1000 Live Billboard</span>
          <span className="text-zinc-300">•</span>
          <span className="text-zinc-950 font-mono">$1.00 per 10×10 block</span>
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-zinc-950 leading-[1.05]">
          Claim your pixels. <br />
          <span className="text-[#ff3b30]">Outbid the rest.</span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-zinc-600 font-medium leading-relaxed">
          The internet&apos;s real-time pay-to-rank billboard. Your position and size on the board reflect your bid.
        </p>

        {/* Viral Hero Input Bar (outbid.lol format) */}
        <form onSubmit={handleHeroOutbid} className="mt-8 mx-auto max-w-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 bg-white border border-zinc-200 rounded-2xl sm:rounded-full shadow-xs hover:border-zinc-300 focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-zinc-900/5 transition">
            {/* Input */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 sm:py-2 flex-1 w-full">
              <span className="text-zinc-400 text-sm">🌐</span>
              <input
                type="text"
                required
                value={heroUrl}
                onChange={(e) => {
                  setHeroUrl(e.target.value);
                  setForm((f) => ({ ...f, targetUrl: e.target.value }));
                }}
                placeholder="Your product URL or @handle"
                className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />
            </div>

            {/* Category Dropdown */}
            <div className="w-full sm:w-auto px-2 sm:px-0">
              <select
                value={heroCategory}
                onChange={(e) => {
                  setHeroCategory(e.target.value);
                  setForm((f) => ({ ...f, category: e.target.value }));
                }}
                className="w-full sm:w-auto border sm:border-0 border-zinc-200 bg-zinc-50 sm:bg-transparent rounded-full px-3.5 py-2 text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer"
              >
                <option value="AI">AI & ML</option>
                <option value="SaaS">SaaS & Apps</option>
                <option value="DevTools">Developer Tools</option>
                <option value="Marketing">Marketing & SEO</option>
                <option value="Fintech">Fintech & Web3</option>
                <option value="Design">Design & Creative</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Outbid Button */}
            <button
              type="submit"
              disabled={reserving}
              className="w-full sm:w-auto rounded-full bg-[#f87171] hover:bg-[#ef4444] text-white px-7 py-2.5 font-bold text-sm transition shadow-2xs hover:scale-[1.02] active:scale-[0.98] shrink-0 disabled:opacity-50"
            >
              {reserving ? "Reserving…" : "Outbid"}
            </button>
          </div>

          <p className="mt-3 text-xs text-zinc-500 font-medium">
            Already on the list? Enter the same URL or @handle and up your bid.
          </p>
        </form>
      </section>

      {/* Main Canvas & Interactive Grid Section */}
      <section
        id="canvas-section"
        className="mx-auto max-w-[1400px] px-4 grid lg:grid-cols-[1fr_380px] gap-8"
      >
        <div className="min-w-0">
          {/* Canvas Component with 10x10 Snapping and Live In-Canvas Logo Preview */}
          {!data ? (
            <div className="aspect-square sm:aspect-[1.12] bg-white border border-zinc-200 rounded-3xl grid place-items-center text-zinc-400 font-bold">
              Loading 1000×1000 Canvas Grid…
            </div>
          ) : (
            <PixelCanvas
              blocks={filteredBlocks as unknown as CanvasBlock[]}
              config={data.config}
              selection={selection}
              onSelect={handleSelect}
              previewTitle={form.title || heroUrl}
              previewImageUrl={form.imageUrl}
            />
          )}

          {/* Selection Status Summary */}
          {selection && (
            <div className="mt-4 bg-zinc-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 grid place-items-center font-mono font-black text-amber-400 text-sm shrink-0">
                  {selectedUnits}b
                </div>
                <div>
                  <div className="text-xs text-zinc-400 font-medium">
                    Grid Location: ({selection.x}, {selection.y}) · {selection.size}×{selection.size} px
                  </div>
                  <div className="text-sm font-black text-white">
                    {selectedUnits} block{selectedUnits > 1 ? "s" : ""} ={" "}
                    <span className="text-amber-400 font-mono">
                      {formatCents(selection.priceCents)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-zinc-400 font-medium">
                ⚡ 30-Day Lease · 10-Minute Lock Hold
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Quick Action & Leaderboard */}
        <div className="space-y-6">
          {/* Quick Claim Card */}
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-base text-zinc-950">
                  Selected Square
                </h3>
                <p className="text-xs text-zinc-500">
                  Click any cell on the grid to reposition
                </p>
              </div>
              <span className="text-xs bg-zinc-950 text-white font-mono font-black px-3 py-1 rounded-full">
                {selection ? `${selection.size}×${selection.size}` : "10×10"}
              </span>
            </div>

            <div className="space-y-3">
              {/* Optional Custom Logo Upload */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs font-bold text-zinc-600 hover:text-zinc-900 flex items-center justify-between w-full py-1"
                >
                  <span>{showAdvanced ? "▼ Logo & Details" : "▶ + Add Logo / Brand Name (Optional)"}</span>
                  {form.imageUrl && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                      ✓ Logo Active
                    </span>
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Brand Name
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Acme Studio"
                        className="w-full border border-zinc-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Upload Logo Image
                      </label>
                      {form.imageUrl ? (
                        <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl p-2">
                          <img
                            src={form.imageUrl}
                            alt="preview"
                            className="w-8 h-8 rounded-lg object-contain bg-zinc-50 border border-zinc-100"
                          />
                          <span className="text-xs text-zinc-600 truncate flex-1">
                            Rendering on grid
                          </span>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, imageUrl: "" })}
                            className="text-xs text-red-600 font-bold hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 border border-dashed border-zinc-300 hover:border-zinc-400 bg-white rounded-xl p-2.5 cursor-pointer text-xs font-bold text-zinc-700">
                          <span>📁 Choose Image File (&lt;2MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 1-Click Outbid Button */}
              <button
                onClick={confirmReserve}
                disabled={reserving || !selection}
                className="w-full bg-[#ff3b30] hover:bg-[#e5352c] text-white rounded-2xl py-3.5 font-black text-base transition shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reserving ? (
                  "Locking Spot…"
                ) : (
                  <>
                    <span>Claim Square</span>
                    <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm font-mono">
                      {selection ? formatCents(selection.priceCents) : "$1.00"}
                    </span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Leaderboard */}
          <Leaderboard rows={leaderboardRows} />
        </div>
      </section>
    </div>
  );
}



