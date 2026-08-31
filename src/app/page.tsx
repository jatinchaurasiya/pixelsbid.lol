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
  const [reservationError, setReservationError] = useState<string | null>(null);
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
    if (reservationError) setReservationError(null);
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
    setReservationError(null);
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
      const err = e instanceof Error ? e.message : "Failed to reserve square";
      setReservationError(err);
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
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedMeta, setExtractedMeta] = useState<{
    title?: string;
    description?: string;
    imageUrl?: string;
    domain?: string;
  } | null>(null);

  // Expanded high-converting industry niches
  const niches = [
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

  // Instant client-side metadata derived as user types
  const instantMeta = (() => {
    if (!heroUrl || heroUrl.trim().length < 2) return null;
    const trimmed = heroUrl.trim();
    if (trimmed.startsWith("@")) {
      const h = trimmed.slice(1).replace(/[^a-zA-Z0-9_]/g, "");
      return {
        title: `@${h}`,
        imageUrl: `https://unavatar.io/x/${h}`,
        domain: "x.com",
      };
    }
    try {
      const domain = trimmed.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
      if (domain.includes(".") && domain.length > 3) {
        const name = domain.split(".")[0].split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
        return {
          title: name,
          imageUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
          domain,
        };
      }
    } catch {}
    return null;
  })();

  const activeLogo = form.imageUrl || extractedMeta?.imageUrl || instantMeta?.imageUrl || "";
  const activeTitle = form.title || extractedMeta?.title || instantMeta?.title || "";

  // Auto-extract metadata from URL / handle with debounce
  useEffect(() => {
    if (!heroUrl || heroUrl.trim().length < 3) {
      setExtractedMeta(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsExtracting(true);
      try {
        const res = await fetch("/api/metadata/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: heroUrl.trim() }),
        });
        const meta = await res.json();
        if (meta.success) {
          setExtractedMeta({
            title: meta.title,
            description: meta.description,
            imageUrl: meta.imageUrl,
            domain: meta.domain,
          });

          // Sync into form and live canvas
          setForm((f) => ({
            ...f,
            title: meta.title || f.title || "",
            imageUrl: meta.imageUrl || f.imageUrl || "",
            targetUrl: meta.targetUrl || heroUrl,
            category: meta.category || f.category || "AI",
          }));

          if (meta.category) {
            setHeroCategory(meta.category);
          }
        }
      } catch (err) {
        console.warn("Metadata extraction failed:", err);
      } finally {
        setIsExtracting(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [heroUrl]);

  const handleHeroOutbid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroUrl.trim()) return;

    let target = heroUrl.trim();
    let title = activeTitle || target;

    if (target.startsWith("@")) {
      const handle = target.replace(/^@/, "");
      target = `https://x.com/${handle}`;
      title = title || `@${handle}`;
    } else if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `https://${target}`;
      try {
        title = title || new URL(target).hostname.replace(/^www\./, "");
      } catch {
        title = title || target;
      }
    }

    setReserving(true);
    try {
      const size = selection?.size || 20;
      let x = selection?.x;
      let y = selection?.y;

      if (x === undefined || y === undefined) {
        // Find first open non-overlapping slot on 10px grid
        const allBlocks = (data?.blocks || []) as unknown as CanvasBlock[];
        let foundSlot = false;
        for (let testY = 0; testY <= 1000 - size; testY += 20) {
          for (let testX = 0; testX <= 1000 - size; testX += 20) {
            const hasOverlap = allBlocks.some((b) => {
              if (b.status === "expired") return false;
              return !(
                testX + size <= b.x ||
                b.x + b.size <= testX ||
                testY + size <= b.y ||
                b.y + b.size <= testY
              );
            });
            if (!hasOverlap) {
              x = testX;
              y = testY;
              foundSlot = true;
              break;
            }
          }
          if (foundSlot) break;
        }
        if (!foundSlot) {
          x = 0;
          y = 0;
        }
      }

      const r = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x,
          y,
          size,
          userId: "anon",
          title: title.trim(),
          targetUrl: target,
          imageUrl: activeLogo || undefined,
          category: heroCategory,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Reservation failed");
      window.location.href = `/rent/${encodeURIComponent(j.id)}`;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to claim square";
      setReservationError(msg);
      const canvasSection = document.getElementById("canvas-section");
      if (canvasSection) canvasSection.scrollIntoView({ behavior: "smooth" });
    } finally {
      setReserving(false);
    }
  };

  return (
    <div className="pb-28 pb-safe">
      <StatsBar />

      {/* Hero Section — Minimalist Outbid Style */}
      <section className="mx-auto max-w-[1200px] px-4 pt-8 pb-8 text-center sm:pt-16 sm:pb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-bold text-zinc-700 shadow-2xs mb-4">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>1000×1000 Live Billboard</span>
          <span className="text-zinc-300">•</span>
          <span className="text-zinc-950 font-mono">$1.00/block</span>
        </div>

        <h1 className="mx-auto max-w-4xl text-3xl sm:text-6xl lg:text-7xl font-black tracking-tight text-zinc-950 leading-[1.1] sm:leading-[1.05]">
          Claim your pixels. <br />
          <span className="text-[#ff3b30]">Outbid the rest.</span>
        </h1>

        <p className="mx-auto mt-3 sm:mt-4 max-w-2xl text-xs sm:text-base text-zinc-600 font-medium leading-relaxed px-2">
          The internet&apos;s real-time pay-to-rank billboard. Your position and size on the board reflect your bid.
        </p>

        {/* Viral Hero Input Bar with Auto Metadata Extractor */}
        <div className="mt-6 sm:mt-8 mx-auto max-w-2xl">
          <form onSubmit={handleHeroOutbid}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-white border border-zinc-200/90 rounded-2xl sm:rounded-full shadow-xs hover:border-zinc-300 focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-zinc-900/5 transition">
              {/* URL Input */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 sm:py-2 flex-1 w-full min-h-[44px]">
                {isExtracting ? (
                  <span className="w-5 h-5 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin shrink-0" />
                ) : activeLogo ? (
                  <img
                    src={activeLogo}
                    alt="Favicon"
                    className="w-5 h-5 rounded-md object-contain shrink-0 bg-white border border-zinc-200"
                    onError={(e) => {
                      if (instantMeta?.domain && !activeLogo.includes("google.com/s2/favicons")) {
                        (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${instantMeta.domain}&sz=128`;
                      }
                    }}
                  />
                ) : (
                  <span className="text-zinc-400 text-sm shrink-0">🌐</span>
                )}
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

              {/* Niche Category Dropdown */}
              <div className="w-full sm:w-auto px-1 sm:px-0">
                <select
                  value={heroCategory}
                  onChange={(e) => {
                    setHeroCategory(e.target.value);
                    setForm((f) => ({ ...f, category: e.target.value }));
                  }}
                  className="w-full sm:w-auto border border-zinc-200 sm:border-0 bg-zinc-50 sm:bg-transparent rounded-xl sm:rounded-full px-3.5 py-2 text-xs font-bold text-zinc-700 focus:outline-none cursor-pointer min-h-[38px]"
                >
                  {niches.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Outbid Button */}
              <button
                type="submit"
                disabled={reserving}
                className="w-full sm:w-auto rounded-xl sm:rounded-full bg-[#f87171] hover:bg-[#ef4444] text-white px-7 py-3 sm:py-2.5 font-bold text-sm transition shadow-2xs hover:scale-[1.02] active:scale-[0.98] shrink-0 disabled:opacity-50 min-h-[44px]"
              >
                {reserving ? "Reserving…" : "Outbid"}
              </button>
            </div>
          </form>

          {/* Real-time Extracted Metadata Info Pill */}
          {(extractedMeta || instantMeta) && (
            <div className="mt-3 mx-auto max-w-xl bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3 flex items-start gap-3 text-left shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden mt-0.5">
                {activeLogo ? (
                  <img
                    src={activeLogo}
                    alt="Logo"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      if (instantMeta?.domain && !activeLogo.includes("google.com/s2/favicons")) {
                        (e.target as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${instantMeta.domain}&sz=128`;
                      }
                    }}
                  />
                ) : (
                  <span className="text-xs font-black text-zinc-700">PX</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-zinc-900 truncate">
                    {activeTitle || instantMeta?.domain}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full shrink-0">
                    {extractedMeta ? "✓ Metadata" : "● Preview"}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {extractedMeta?.description || `Ready to claim your 30-day billboard spot on pixelbids.lol`}
                </p>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-zinc-500 font-medium">
            Already on the list? Enter the same URL or @handle and up your bid.
          </p>
        </div>
      </section>

      {/* Main Canvas & Interactive Grid Section */}
      <section
        id="canvas-section"
        className="mx-auto max-w-[1400px] px-3 sm:px-4 grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8"
      >
        <div className="min-w-0">
          {/* Canvas Component with 10x10 Snapping and Live In-Canvas Logo Preview */}
          {!data ? (
            <div className="aspect-square sm:aspect-[1.12] bg-white border border-zinc-200 rounded-3xl grid place-items-center text-zinc-400 font-bold text-sm p-4 text-center">
              Loading 1000×1000 Canvas Grid…
            </div>
          ) : (
            <PixelCanvas
              blocks={filteredBlocks as unknown as CanvasBlock[]}
              config={data.config}
              selection={selection}
              onSelect={handleSelect}
              previewTitle={activeTitle}
              previewImageUrl={activeLogo}
            />
          )}

          {/* Selection Status Summary */}
          {selection && (
            <div className="mt-3 sm:mt-4 bg-zinc-900 text-white rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-md border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-800 border border-zinc-700 grid place-items-center font-mono font-black text-amber-400 text-xs sm:text-sm shrink-0">
                  {selectedUnits}b
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs text-zinc-400 font-medium">
                    Grid: ({selection.x}, {selection.y}) · {selection.size}×{selection.size} px
                  </div>
                  <div className="text-xs sm:text-sm font-black text-white">
                    {selectedUnits} block{selectedUnits > 1 ? "s" : ""} ={" "}
                    <span className="text-amber-400 font-mono">
                      {formatCents(selection.priceCents)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] sm:text-xs text-zinc-400 font-medium">
                ⚡ 30-Day Lease · 10-Min Hold
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Quick Action & Leaderboard */}
        <div className="space-y-6">
          {/* Quick Claim Card */}
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-base text-zinc-950">
                  Selected Square
                </h3>
                <p className="text-xs text-zinc-500">
                  Tap any cell on the grid to reposition
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
                        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
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
                        <label className="flex items-center justify-center gap-2 border border-dashed border-zinc-300 hover:border-zinc-400 bg-white rounded-xl p-2.5 cursor-pointer text-xs font-bold text-zinc-700 min-h-[44px]">
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

              {reservationError && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 flex items-start gap-2 animate-in fade-in duration-150">
                  <span className="font-bold shrink-0">⚠️</span>
                  <div className="flex-1 font-medium leading-relaxed">{reservationError}</div>
                  <button
                    type="button"
                    onClick={() => setReservationError(null)}
                    className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 1-Click Outbid Button */}
              <button
                onClick={confirmReserve}
                disabled={reserving || !selection}
                className="w-full bg-[#ff3b30] hover:bg-[#e5352c] text-white rounded-2xl py-3.5 font-black text-base transition shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
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

      {/* Mobile Sticky Claim Drawer */}
      {selection && (
        <div className="sm:hidden fixed bottom-3 left-3 right-3 z-40 bg-zinc-950/95 backdrop-blur-lg text-white border border-zinc-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs font-black text-white truncate">
                {selection.size}×{selection.size} px ({selectedUnits}b)
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono truncate">
              📍 ({selection.x}, {selection.y}) · <span className="text-amber-400 font-bold">{formatCents(selection.priceCents)}</span>
            </div>
          </div>

          <button
            onClick={confirmReserve}
            disabled={reserving}
            className="bg-[#ff3b30] hover:bg-[#e5352c] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md shrink-0 flex items-center gap-1.5 active:scale-95 transition"
          >
            {reserving ? "Locking…" : "Claim Spot →"}
          </button>
        </div>
      )}
    </div>
  );
}




