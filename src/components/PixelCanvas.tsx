"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

export type CanvasBlock = {
  id: string;
  x: number;
  y: number;
  size: number;
  imageUrl: string | null;
  title: string | null;
  targetUrl: string | null;
  status: string;
  clicks: number;
  priceCents: number;
};

type SelectionState = {
  x: number;
  y: number;
  size: number;
  priceCents: number;
};

type Props = {
  blocks: CanvasBlock[];
  config: { width: number; height: number };
  selection: SelectionState | null;
  onSelect: (sel: SelectionState | null) => void;
  previewTitle?: string;
  previewImageUrl?: string;
};

export default function PixelCanvas({
  blocks,
  config,
  selection,
  onSelect,
  previewTitle,
  previewImageUrl,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.95);
  const [pan, setPan] = useState({ x: 16, y: 16 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [hoverBlock, setHoverBlock] = useState<CanvasBlock | null>(null);
  const [hoverGridPos, setHoverGridPos] = useState<{ x: number; y: number } | null>(null);
  const [tick, setTick] = useState(0);

  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const previewImgRef = useRef<HTMLImageElement | null>(null);

  // Keep preview image updated
  useEffect(() => {
    if (!previewImageUrl) {
      previewImgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      previewImgRef.current = img;
      setTick((t) => t + 1);
    };
    img.onerror = () => {
      // If error, try fallback icon
      if (!previewImageUrl.includes("google.com/s2/favicons")) {
        try {
          const u = new URL(previewImageUrl);
          const fb = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
          const fallbackImg = new Image();
          fallbackImg.onload = () => {
            previewImgRef.current = fallbackImg;
            setTick((t) => t + 1);
          };
          fallbackImg.src = fb;
          return;
        } catch {
          // ignore
        }
      }
      previewImgRef.current = null;
    };
    img.src = previewImageUrl;
  }, [previewImageUrl]);

  const priceFor = (s: number) => {
    const units = Math.max(1, Math.round((s / 10) * (s / 10)));
    return units * 100;
  };

  const hasOverlap = useCallback(
    (x: number, y: number, size: number) => {
      for (const b of blocks) {
        if (["reserved", "pending_review", "active"].includes(b.status)) {
          const overlap = !(
            x + size <= b.x ||
            b.x + b.size <= x ||
            y + size <= b.y ||
            b.y + b.size <= y
          );
          if (overlap) return true;
        }
      }
      if (x < 0 || y < 0 || x + size > config.width || y + size > config.height) return true;
      return false;
    },
    [blocks, config]
  );

  const getBlockAt = useCallback(
    (px: number, py: number) => {
      return (
        blocks.find(
          (b) =>
            px >= b.x &&
            px < b.x + b.size &&
            py >= b.y &&
            py < b.y + b.size
        ) || null
      );
    },
    [blocks]
  );

  const canvasToWorld = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    return {
      x: (cx - pan.x) / scale,
      y: (cy - pan.y) / scale,
    };
  };

  // Auto-fit on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.min(w / (config.width + 40), h / (config.height + 40));
      const target = Math.max(0.6, Math.min(1.4, s * 0.98));
      setScale(target);
      setPan({
        x: (w - config.width * target) / 2,
        y: (h - config.height * target) / 2,
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [config.width, config.height]);

  // Main Canvas Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Canvas Container Background
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    // 1000x1000 Canvas Board Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, config.width, config.height);

    // 10px Grid Lines (10x10 block units)
    ctx.strokeStyle = "#f4f4f5";
    ctx.lineWidth = 0.6 / scale;
    for (let x = 0; x <= config.width; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, config.height);
      ctx.stroke();
    }
    for (let y = 0; y <= config.height; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(config.width, y);
      ctx.stroke();
    }

    // 50px Major Grid Lines
    ctx.strokeStyle = "#e4e4e7";
    ctx.lineWidth = 1 / scale;
    for (let x = 0; x <= config.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, config.height);
      ctx.stroke();
    }
    for (let y = 0; y <= config.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(config.width, y);
      ctx.stroke();
    }

    // 100px Canvas Grid Marks
    ctx.strokeStyle = "#d4d4d8";
    ctx.lineWidth = 1.4 / scale;
    for (let x = 0; x <= config.width; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, config.height);
      ctx.stroke();
    }
    for (let y = 0; y <= config.height; y += 100) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(config.width, y);
      ctx.stroke();
    }

    // Outer Border
    ctx.strokeStyle = "#18181b";
    ctx.lineWidth = 2.5 / scale;
    ctx.strokeRect(0, 0, config.width, config.height);

    const viewLeft = -pan.x / scale;
    const viewTop = -pan.y / scale;
    const viewRight = viewLeft + rect.width / scale;
    const viewBottom = viewTop + rect.height / scale;

    // Render Blocks
    for (const b of blocks) {
      if (
        b.x + b.size < viewLeft ||
        b.x > viewRight ||
        b.y + b.size < viewTop ||
        b.y > viewBottom
      )
        continue;

      if (b.status === "active" || b.status === "pending_review") {
        const key = b.id;
        let img = imgCache.current.get(key);
        if (b.imageUrl && !img) {
          img = new Image();
          img.onload = () => setTick((t) => t + 1);
          img.onerror = () => {
            // If primary image fails, fallback to domain favicon if possible
            if (b.targetUrl && !b.imageUrl?.includes("google.com/s2/favicons")) {
              try {
                const u = new URL(b.targetUrl.startsWith("http") ? b.targetUrl : `https://${b.targetUrl}`);
                const fb = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
                const fallbackImg = new Image();
                fallbackImg.onload = () => {
                  imgCache.current.set(key, fallbackImg);
                  setTick((t) => t + 1);
                };
                fallbackImg.src = fb;
                return;
              } catch {
                // ignore
              }
            }
            setTick((t) => t + 1);
          };
          img.src = b.imageUrl;
          imgCache.current.set(key, img);
        }

        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.drawImage(img, b.x, b.y, b.size, b.size);
          ctx.restore();
        } else {
          const hue = (b.x * 11 + b.y * 17) % 360;
          ctx.fillStyle = `hsl(${hue} 70% 90%)`;
          ctx.fillRect(b.x, b.y, b.size, b.size);
          const initials = (b.title || "PX").slice(0, 2).toUpperCase();
          ctx.fillStyle = `hsl(${hue} 60% 28%)`;
          const fontSize = Math.max(8, Math.min(22, b.size * 0.45));
          ctx.font = `800 ${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(initials, b.x + b.size / 2, b.y + b.size / 2);
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        }

        ctx.strokeStyle =
          b.status === "pending_review" ? "#f59e0b" : "rgba(0,0,0,0.15)";
        ctx.lineWidth = Math.max(1 / scale, 1.2 / scale);
        ctx.strokeRect(b.x, b.y, b.size, b.size);
      } else if (b.status === "reserved") {
        ctx.fillStyle = "rgba(255,59,48,0.15)";
        ctx.fillRect(b.x, b.y, b.size, b.size);
        ctx.strokeStyle = "rgba(255,59,48,0.6)";
        ctx.setLineDash([4 / scale, 4 / scale]);
        ctx.lineWidth = 1.5 / scale;
        ctx.strokeRect(b.x, b.y, b.size, b.size);
        ctx.setLineDash([]);
      }
    }

    // Hover Highlight (snapped to 10px)
    if (hoverGridPos && !selection) {
      const hx = Math.floor(hoverGridPos.x / 10) * 10;
      const hy = Math.floor(hoverGridPos.y / 10) * 10;
      if (hx >= 0 && hy >= 0 && hx < config.width && hy < config.height) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.fillRect(hx, hy, 10, 10);
        ctx.strokeStyle = "#18181b";
        ctx.lineWidth = 1.2 / scale;
        ctx.strokeRect(hx, hy, 10, 10);
      }
    }

    // Render Active Selection & Live Preview
    if (selection) {
      const { x, y, size } = selection;
      const isOverlap = hasOverlap(x, y, size);

      ctx.save();
      if (previewImgRef.current && !isOverlap) {
        ctx.drawImage(previewImgRef.current, x, y, size, size);
      } else {
        ctx.fillStyle = isOverlap
          ? "rgba(239, 68, 68, 0.25)"
          : "rgba(16, 185, 129, 0.2)";
        ctx.fillRect(x, y, size, size);

        if (previewTitle && !isOverlap) {
          ctx.fillStyle = "#047857";
          const fontSize = Math.max(8, Math.min(16, size * 0.2));
          ctx.font = `800 ${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            previewTitle.slice(0, 12),
            x + size / 2,
            y + size / 2
          );
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        }
      }

      // Animated glowing border for selection
      ctx.strokeStyle = isOverlap ? "#ef4444" : "#ff3b30";
      ctx.lineWidth = 2.5 / scale;
      ctx.strokeRect(x, y, size, size);

      // Coordinate & Price Badge Above Square
      const units = Math.max(1, Math.round((size / 10) * (size / 10)));
      const label = `${size}×${size} (${units} blocks) · $${units}.00`;
      ctx.font = `800 ${12 / scale}px Inter, sans-serif`;
      const tw = ctx.measureText(label).width;
      const badgeW = tw + 14 / scale;
      const badgeH = 18 / scale;
      const badgeX = Math.min(config.width - badgeW, Math.max(0, x));
      const badgeY = Math.max(20 / scale, y - 6 / scale);

      ctx.fillStyle = isOverlap ? "#dc2626" : "#18181b";
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY - badgeH, badgeW, badgeH, 4 / scale);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, badgeX + 7 / scale, badgeY - 5 / scale);

      ctx.restore();
    }

    ctx.restore();
  }, [
    blocks,
    config,
    pan,
    scale,
    selection,
    hoverGridPos,
    previewTitle,
    hasOverlap,
    tick,
  ]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      setScale((s) => Math.min(4, Math.max(0.35, s + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    const world = canvasToWorld(e.clientX, e.clientY);
    if (e.button === 1 || e.altKey || e.shiftKey) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    // Snap to 10px grid
    const gx = Math.floor(world.x / 10) * 10;
    const gy = Math.floor(world.y / 10) * 10;

    if (gx < 0 || gy < 0 || gx >= config.width || gy >= config.height) return;

    // Check if clicked inside existing block to view it
    const existing = getBlockAt(world.x, world.y);
    if (existing && existing.status === "active") {
      setHoverBlock(existing);
      return;
    }

    // Check if clicking inside current selection to drag-move it
    if (
      selection &&
      world.x >= selection.x &&
      world.x < selection.x + selection.size &&
      world.y >= selection.y &&
      world.y < selection.y + selection.size
    ) {
      setIsDraggingSelection(true);
      setLastPanPoint({ x: gx - selection.x, y: gy - selection.y });
      return;
    }

    // Select this 10x10 spot
    const initialSize = selection ? selection.size : 10;
    const clampedX = Math.min(config.width - initialSize, Math.max(0, gx));
    const clampedY = Math.min(config.height - initialSize, Math.max(0, gy));

    onSelect({
      x: clampedX,
      y: clampedY,
      size: initialSize,
      priceCents: priceFor(initialSize),
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const world = canvasToWorld(e.clientX, e.clientY);

    if (isPanning && lastPanPoint) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDraggingSelection && selection && lastPanPoint) {
      const gx = Math.floor(world.x / 10) * 10;
      const gy = Math.floor(world.y / 10) * 10;
      const targetX = Math.min(
        config.width - selection.size,
        Math.max(0, gx - lastPanPoint.x)
      );
      const targetY = Math.min(
        config.height - selection.size,
        Math.max(0, gy - lastPanPoint.y)
      );

      onSelect({
        ...selection,
        x: targetX,
        y: targetY,
      });
      return;
    }

    setHoverGridPos({ x: world.x, y: world.y });
    const b = getBlockAt(Math.floor(world.x), Math.floor(world.y));
    setHoverBlock(b);
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    setIsDraggingSelection(false);
    setLastPanPoint(null);
  };

  const handleSetSize = (newSize: number) => {
    const clampedSize = Math.max(10, Math.min(100, Math.round(newSize / 10) * 10));
    const currentX = selection ? selection.x : 0;
    const currentY = selection ? selection.y : 0;
    const clampedX = Math.min(config.width - clampedSize, Math.max(0, currentX));
    const clampedY = Math.min(config.height - clampedSize, Math.max(0, currentY));

    onSelect({
      x: clampedX,
      y: clampedY,
      size: clampedSize,
      priceCents: priceFor(clampedSize),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Top Canvas Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-zinc-950 text-white rounded-full px-3.5 py-1.5 font-bold shadow-xs">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span>1000×1000 Grid</span>
            <span className="text-zinc-500">•</span>
            <span className="text-amber-400 font-mono">$1 / 10×10 block</span>
          </div>

          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-full p-1 shadow-2xs">
            <button
              onClick={() => setScale((s) => Math.min(4, s + 0.18))}
              className="w-7 h-7 grid place-items-center rounded-full hover:bg-zinc-100 font-bold"
              title="Zoom In"
            >
              ＋
            </button>
            <span className="px-2 font-mono text-xs font-bold text-zinc-700">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.max(0.35, s - 0.18))}
              className="w-7 h-7 grid place-items-center rounded-full hover:bg-zinc-100 font-bold"
              title="Zoom Out"
            >
              －
            </button>
            <button
              onClick={() => {
                const el = containerRef.current;
                if (!el) return;
                const w = el.clientWidth,
                  h = el.clientHeight;
                const s = Math.min(
                  w / (config.width + 40),
                  h / (config.height + 40)
                );
                const target = Math.max(0.6, Math.min(1.4, s * 0.98));
                setScale(target);
                setPan({
                  x: (w - config.width * target) / 2,
                  y: (h - config.height * target) / 2,
                });
              }}
              className="px-3 py-1 rounded-full bg-zinc-900 text-white text-xs font-bold hover:bg-black transition"
            >
              Fit
            </button>
          </div>
        </div>

        {/* Hover Inspector */}
        {hoverBlock && hoverBlock.status === "active" && (
          <Link
            href={`/block/${encodeURIComponent(hoverBlock.id)}`}
            className="inline-flex items-center gap-2 border border-zinc-200 bg-white rounded-full px-3 py-1.5 hover:bg-zinc-50 max-w-[280px] shadow-xs transition"
          >
            {hoverBlock.imageUrl ? (
              <img
                src={hoverBlock.imageUrl}
                alt=""
                className="w-5 h-5 rounded object-contain border border-zinc-100 bg-white"
              />
            ) : (
              <span className="w-5 h-5 rounded bg-zinc-900 text-white text-[10px] font-black grid place-items-center">
                {(hoverBlock.title || "PX").slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="font-bold truncate text-xs text-zinc-900">
              {hoverBlock.title || "Untitled"}
            </span>
            <span className="text-zinc-500 text-[11px] shrink-0 font-mono">
              {hoverBlock.size}×{hoverBlock.size} · {hoverBlock.clicks} clicks
            </span>
          </Link>
        )}
      </div>

      {/* Main Canvas Area & 10x10 Size Presets Column */}
      <div className="grid lg:grid-cols-[1fr_120px] gap-3">
        <div
          ref={containerRef}
          className="relative w-full aspect-square sm:aspect-[1.12] bg-zinc-100 border border-zinc-300 rounded-3xl overflow-hidden shadow-inner"
        >
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full touch-none ${
              isDraggingSelection ? "cursor-grabbing" : "cursor-crosshair"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ touchAction: "none" }}
          />

          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur border border-zinc-200 rounded-full px-3.5 py-1.5 text-xs font-bold text-zinc-700 shadow-sm pointer-events-none">
            💡 Click any open 10×10 cell to select · Drag selection box to reposition
          </div>
        </div>

        {/* 10x10 Presets Column */}
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible p-2 bg-white border border-zinc-200 rounded-3xl shadow-xs">
          <div className="text-[11px] font-black uppercase tracking-wider text-zinc-500 px-2 pt-1 hidden lg:block">
            Size Column
          </div>
          {[
            { size: 10, label: "10×10", price: "$1", blocks: 1 },
            { size: 20, label: "20×20", price: "$4", blocks: 4 },
            { size: 30, label: "30×30", price: "$9", blocks: 9 },
            { size: 40, label: "40×40", price: "$16", blocks: 16 },
            { size: 50, label: "50×50", price: "$25", blocks: 25 },
            { size: 80, label: "80×80", price: "$64", blocks: 64 },
            { size: 100, label: "100×100", price: "$100", blocks: 100 },
          ].map((preset) => {
            const isCurrent = selection?.size === preset.size;
            return (
              <button
                key={preset.size}
                onClick={() => handleSetSize(preset.size)}
                className={`flex-1 lg:flex-none flex flex-col items-center justify-center p-2.5 rounded-2xl border transition text-center shrink-0 ${
                  isCurrent
                    ? "bg-zinc-950 text-white border-zinc-950 shadow-md ring-2 ring-red-500"
                    : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-900"
                }`}
              >
                <span className="font-black text-xs">{preset.label}</span>
                <span
                  className={`text-[10px] font-bold mt-0.5 ${
                    isCurrent ? "text-amber-400" : "text-zinc-500"
                  }`}
                >
                  {preset.price} ({preset.blocks}b)
                </span>
              </button>
            );
          })}

          {/* Stepper Buttons */}
          <div className="flex items-center gap-1 mt-auto pt-2 border-t border-zinc-100">
            <button
              onClick={() => handleSetSize((selection?.size || 10) - 10)}
              className="flex-1 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-700 text-center"
              title="Decrease size by 10px"
            >
              -10
            </button>
            <button
              onClick={() => handleSetSize((selection?.size || 10) + 10)}
              className="flex-1 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-bold text-zinc-700 text-center"
              title="Increase size by 10px"
            >
              +10
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

