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

  return (
    <div className="pb-28">
      <StatsBar />

      {/* Hero Section — Hallmark Modern Minimal / High Contrast */}
      <section className="mx-auto max-w-[1300px] px-4 pt-8 pb-6 text-center sm:pt-12 sm:pb-10">
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

        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-zinc-600 font-medium leading-relaxed">
          The internet&apos;s most viral billboard. Click any 10×10 block, upload your logo, and claim your permanent 30-day spotlight on{" "}
          <span className="text-zinc-900 font-bold underline decoration-red-500 decoration-2 underline-offset-2">
            pixelsbid.lol
          </span>
          .
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#canvas-section"
            className="rounded-full bg-[#ff3b30] px-8 py-3.5 text-base font-black text-white hover:bg-[#e5352c] transition shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            🎯 Configure & Claim Square →
          </a>
          <Link
            href="/leaderboard"
            className="rounded-full border border-zinc-200 bg-white px-7 py-3.5 text-base font-bold text-zinc-900 hover:bg-zinc-50 transition shadow-2xs"
          >
            ★ View Leaderboard
          </Link>
        </div>
      </section>

      {/* Main Canvas & Interactive Setup Panel */}
      <section
        id="canvas-section"
        className="mx-auto max-w-[1400px] px-4 grid lg:grid-cols-[1fr_400px] gap-8"
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
              previewTitle={form.title}
              previewImageUrl={form.imageUrl}
            />
          )}

          {/* Quick Selection Summary Footer */}
          {selection && (
            <div className="mt-4 bg-zinc-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 grid place-items-center font-mono font-black text-amber-400 text-sm shrink-0">
                  {selectedUnits}b
                </div>
                <div>
                  <div className="text-xs text-zinc-400 font-medium">
                    Grid Position: ({selection.x}, {selection.y}) · {selection.size}×{selection.size} px
                  </div>
                  <div className="text-sm font-black text-white">
                    {selectedUnits} block{selectedUnits > 1 ? "s" : ""} (
                    {selection.size * selection.size} pixels) ={" "}
                    <span className="text-amber-400 font-mono">
                      {formatCents(selection.priceCents)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-zinc-400">
                ⚡ 30-Day Lease · 10-Min Checkout Hold
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Inline Configuration Form & Checkout */}
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-lg text-zinc-900">
                  Setup Your Pixel Square
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Live preview updates right on the canvas
                </p>
              </div>
              <span className="text-xs bg-zinc-900 text-white font-mono font-bold px-2.5 py-1 rounded-full">
                {selection ? `${selection.size}×${selection.size}` : "Pick Square"}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Project or Brand Name
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Acme Studio / My SaaS"
                  className="mt-1 w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-zinc-50 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Destination URL (Click Target)
                </label>
                <input
                  type="url"
                  value={form.targetUrl}
                  onChange={(e) =>
                    setForm({ ...form, targetUrl: e.target.value })
                  }
                  placeholder="https://yourwebsite.com"
                  className="mt-1 w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-zinc-50 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Logo / Brand Asset
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm({ ...form, imageUrl: e.target.value })
                    }
                    placeholder="https://.../logo.png"
                    className="flex-1 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-zinc-50 focus:bg-white transition"
                  />
                  <label className="cursor-pointer border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-700 shrink-0">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                {form.imageUrl && (
                  <div className="mt-2 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl p-2">
                    <img
                      src={form.imageUrl}
                      alt="Logo preview"
                      className="w-8 h-8 rounded-lg object-contain bg-white border border-zinc-100"
                    />
                    <span className="text-xs text-zinc-600 truncate flex-1">
                      Logo connected & rendering on grid
                    </span>
                    <button
                      onClick={() => setForm({ ...form, imageUrl: "" })}
                      className="text-xs text-red-500 font-bold hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Category Tag
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {["AI", "SaaS", "DevTools", "Fintech", "Crypto", "Design", "Other"].map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm({ ...form, category: cat })}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                          form.category === cat
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                            : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={confirmReserve}
                  disabled={reserving || !selection}
                  className="w-full bg-[#ff3b30] text-white rounded-2xl py-3.5 font-black text-base hover:bg-[#e5352c] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reserving
                    ? "Locking Spot…"
                    : `Lock & Checkout (${
                        selection
                          ? formatCents(selection.priceCents)
                          : "$1.00"
                      }) →`}
                </button>
                <div className="text-[11px] text-center text-zinc-500 mt-2">
                  Instant live placement upon checkout. 30-day lease with click tracking.
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Spotlight */}
          <Leaderboard rows={leaderboardRows} />
        </div>
      </section>
    </div>
  );
}


