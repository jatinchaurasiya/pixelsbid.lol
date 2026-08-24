"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

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

type Props = {
  blocks: CanvasBlock[];
  config: { width: number; height: number };
  onSelect: (sel: { x: number; y: number; size: number; priceCents: number }) => void;
};

export default function PixelCanvas({ blocks, config, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<CanvasBlock | null>(null);
  const [selectedSize, setSelectedSize] = useState(5);

  // virtualized image cache
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const getBlockAt = useCallback((px: number, py: number) => {
    return blocks.find(b => px >= b.x && px < b.x + b.size && py >= b.y && py < b.y + b.size) || null;
  }, [blocks]);

  const priceFor = (s: number) => s * s * 100;

  const hasOverlap = useCallback((x: number, y: number, size: number) => {
    for (const b of blocks) {
      if (["reserved", "pending_review", "active"].includes(b.status)) {
        const overlap = !(x + size <= b.x || b.x + b.size <= x || y + size <= b.y || b.y + b.size <= y);
        if (overlap) return true;
      }
    }
    if (x < 0 || y < 0 || x + size > config.width || y + size > config.height) return true;
    return false;
  }, [blocks, config]);

  const canvasToWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    // canvas logical size vs display size
    const scaleX = (config.width * scale + pan.x * 0) ; // not needed
    // Instead compute world by inverting transform
    // We draw at: ctx.scale(scale); then translation pan
    // Simpler: world = (client - pan) / scale
    return {
      x: (cx - pan.x) / scale,
      y: (cy - pan.y) / scale,
    };
  };

  // Render loop
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

    // clear
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    // grid bg
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, config.width, config.height);
    ctx.strokeStyle = "#f4f4f5";
    ctx.lineWidth = 1 / scale;
    // faint grid every 50px
    for (let x = 0; x <= config.width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, config.height); ctx.stroke();
    }
    for (let y = 0; y <= config.height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(config.width, y); ctx.stroke();
    }
    // border
    ctx.strokeStyle = "#e4e4e7";
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(0, 0, config.width, config.height);

    // viewport culling
    const viewLeft = -pan.x / scale;
    const viewTop = -pan.y / scale;
    const viewRight = viewLeft + rect.width / scale;
    const viewBottom = viewTop + rect.height / scale;

    for (const b of blocks) {
      if (b.x + b.size < viewLeft || b.x > viewRight || b.y + b.size < viewTop || b.y > viewBottom) continue;
      // block bg
      if (b.status === "active" || b.status === "pending_review") {
        const key = b.id;
        let img = imgCache.current.get(key);
        if (b.imageUrl && !img) {
          img = new Image();
          img.crossOrigin = "anonymous";
          img.src = b.imageUrl;
          imgCache.current.set(key, img);
        }
        if (img && img.complete && img.naturalWidth) {
          ctx.drawImage(img, b.x, b.y, b.size, b.size);
        } else {
          ctx.fillStyle = b.status === "pending_review" ? "#fef3c7" : "#e4e4e7";
          ctx.fillRect(b.x, b.y, b.size, b.size);
          if (b.title) {
            ctx.fillStyle = "#71717a";
            ctx.font = `${Math.max(6, b.size / 3)}px sans-serif`;
            ctx.fillText(b.title.slice(0, 12), b.x + 2, b.y + b.size / 2);
          }
        }
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 1 / scale;
        ctx.strokeRect(b.x, b.y, b.size, b.size);
      } else if (b.status === "reserved") {
        ctx.fillStyle = "rgba(255,59,48,0.15)";
        ctx.fillRect(b.x, b.y, b.size, b.size);
        ctx.strokeStyle = "rgba(255,59,48,0.4)";
        ctx.setLineDash([4 / scale, 4 / scale]);
        ctx.strokeRect(b.x, b.y, b.size, b.size);
        ctx.setLineDash([]);
      }
    }

    // drag selection preview
    if (dragStart && dragEnd) {
      const x = Math.min(dragStart.x, dragEnd.x);
      const y = Math.min(dragStart.y, dragEnd.y);
      const w = Math.abs(dragEnd.x - dragStart.x);
      const h = Math.abs(dragEnd.y - dragStart.y);
      const size = Math.max(1, Math.min(w, h));
      // snap to square from start
      const sx = dragStart.x;
      const sy = dragStart.y;
      const snappedX = dragEnd.x >= dragStart.x ? sx : sx - size;
      const snappedY = dragEnd.y >= dragStart.y ? sy : sy - size;
      const ix = Math.max(0, Math.round(snappedX));
      const iy = Math.max(0, Math.round(snappedY));
      const isOverlap = hasOverlap(ix, iy, size);
      ctx.fillStyle = isOverlap ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)";
      ctx.fillRect(ix, iy, size, size);
      ctx.strokeStyle = isOverlap ? "#ef4444" : "#22c55e";
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([]);
      ctx.strokeRect(ix, iy, size, size);
      ctx.fillStyle = isOverlap ? "#ef4444" : "#16a34a";
      ctx.font = `bold ${12 / scale}px sans-serif`;
      const label = `${size}×${size} · $${size * size}`;
      ctx.fillText(label, ix, iy - 6 / scale);
    }

    ctx.restore();

    // minimap handled elsewhere
  }, [blocks, config, pan, scale, dragStart, dragEnd, hasOverlap]);

  // wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setScale(s => Math.min(4, Math.max(0.15, s + delta)));
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
    const clamped = { x: Math.floor(world.x), y: Math.floor(world.y) };
    setDragStart(clamped);
    setDragEnd(clamped);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning && lastPanPoint) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
    const world = canvasToWorld(e.clientX, e.clientY);
    if (dragStart && e.buttons === 1) {
      setDragEnd({ x: Math.floor(world.x), y: Math.floor(world.y) });
    } else {
      const b = getBlockAt(Math.floor(world.x), Math.floor(world.y));
      setHover(b);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }
    if (!dragStart || !dragEnd) return;
    const x = Math.min(dragStart.x, dragEnd.x);
    const y = Math.min(dragStart.y, dragEnd.y);
    const w = Math.abs(dragEnd.x - dragStart.x);
    const h = Math.abs(dragEnd.y - dragStart.y);
    const size = Math.max(1, Math.min(w, h));
    const sx = dragStart.x;
    const sy = dragStart.y;
    const snappedX = dragEnd.x >= dragStart.x ? sx : sx - size;
    const snappedY = dragEnd.y >= dragStart.y ? sy : sy - size;
    const ix = Math.max(0, Math.round(snappedX));
    const iy = Math.max(0, Math.round(snappedY));
    setDragStart(null);
    setDragEnd(null);
    if (size < 1) return;
    if (hasOverlap(ix, iy, size)) {
      // visual shake, don't proceed
      return;
    }
    const finalSize = Math.min(size, 50);
    onSelect({ x: ix, y: iy, size: finalSize, priceCents: priceFor(finalSize) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="inline-flex items-center gap-2 bg-zinc-900 text-white rounded-full px-3 py-1.5">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> LIVE CANVAS
          <span className="opacity-60">1000×1000</span>
        </div>
        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-full p-1">
          <button onClick={() => setScale(s => Math.min(4, s + 0.15))} className="w-7 h-7 grid place-items-center rounded-full hover:bg-zinc-100">＋</button>
          <span className="px-2 font-mono text-xs">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(0.15, s - 0.15))} className="w-7 h-7 grid place-items-center rounded-full hover:bg-zinc-100">－</button>
          <button onClick={() => { setPan({ x: 0, y: 0 }); setScale(0.6); }} className="px-3 py-1 rounded-full bg-zinc-900 text-white text-xs font-bold">Reset</button>
        </div>
        <span className="text-zinc-500">Drag to select a square • Shift+drag or middle-drag to pan • Scroll to zoom</span>
        {hover && (
          <Link href={`/block/${hover.id}`} className="ml-auto inline-flex items-center gap-2 border border-zinc-200 bg-white rounded-full px-3 py-1.5 hover:bg-zinc-50">
            <span className="w-6 h-6 rounded overflow-hidden bg-zinc-100 grid place-items-center text-[10px]">{hover.title?.slice(0,2) || "••"}</span>
            <span className="font-bold">{hover.title}</span>
            <span className="text-zinc-500">{hover.size}×{hover.size} · {hover.clicks} clicks</span>
          </Link>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative w-full aspect-[1.35] bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: "none" }}
        />
        {/* size presets overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur border border-zinc-200 rounded-full p-1 shadow">
          {[1,2,3,5,10,20].map(s => (
            <button
              key={s}
              onClick={() => setSelectedSize(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${selectedSize===s ? "bg-zinc-900 text-white" : "hover:bg-zinc-100"}`}
            >
              {s}×{s}
            </button>
          ))}
          <span className="px-2 text-xs text-zinc-500">${selectedSize*selectedSize}</span>
        </div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur border border-zinc-200 rounded-xl px-3 py-2 text-xs shadow">
          <div className="font-bold">How it works</div>
          <div className="text-zinc-500 leading-tight">Select a square → pay $1/pixel (size²) → get 30 days live → clicks tracked</div>
        </div>
      </div>
    </div>
  );
}
