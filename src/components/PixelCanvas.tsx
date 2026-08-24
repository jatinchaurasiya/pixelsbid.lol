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
  const [scale, setScale] = useState(0.95);
  const [pan, setPan] = useState({ x: 12, y: 12 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<CanvasBlock | null>(null);
  const [selectedSize] = useState(5);
  const [tick, setTick] = useState(0);

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
    return {
      x: (cx - pan.x) / scale,
      y: (cy - pan.y) / scale,
    };
  };

  // Auto-fit on mount and when container resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      // fit 1000x1000 into container with padding
      const s = Math.min(w / (config.width + 40), h / (config.height + 40));
      const target = Math.max(0.6, Math.min(1.4, s * 0.98));
      setScale(target);
      setPan({ x: (w - config.width * target) / 2, y: (h - config.height * target) / 2 });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [config.width, config.height]);

  // Render loop — re-runs on blocks, pan, scale, drag, and tick (image loads)
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

    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    // canvas background + subtle inner shadow
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, config.width, config.height);
    ctx.fillStyle = "rgba(0,0,0,0.02)";
    ctx.fillRect(0, 0, config.width, config.height);

    // grid every 50px — more visible for production
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1 / scale;
    for (let x = 0; x <= config.width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, config.height); ctx.stroke();
    }
    for (let y = 0; y <= config.height; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(config.width, y); ctx.stroke();
    }
    // stronger every 100px
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1.2 / scale;
    for (let x = 0; x <= config.width; x += 100) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, config.height); ctx.stroke();
    }
    for (let y = 0; y <= config.height; y += 100) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(config.width, y); ctx.stroke();
    }

    ctx.strokeStyle = "#d4d4d8";
    ctx.lineWidth = 2.5 / scale;
    ctx.strokeRect(0, 0, config.width, config.height);

    const viewLeft = -pan.x / scale;
    const viewTop = -pan.y / scale;
    const viewRight = viewLeft + rect.width / scale;
    const viewBottom = viewTop + rect.height / scale;

    for (const b of blocks) {
      if (b.x + b.size < viewLeft || b.x > viewRight || b.y + b.size < viewTop || b.y > viewBottom) continue;

      if (b.status === "active" || b.status === "pending_review") {
        const key = b.id;
        let img = imgCache.current.get(key);
        if (b.imageUrl && !img) {
          img = new Image();
          img.crossOrigin = "anonymous";
          // force trigger redraw when loaded
          img.onload = () => setTick((t) => t + 1);
          img.onerror = () => setTick((t) => t + 1);
          img.src = b.imageUrl;
          imgCache.current.set(key, img);
        }
        if (img && img.complete && img.naturalWidth > 0) {
          // crisp image with border
          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.08)";
          ctx.shadowBlur = 6 / scale;
          ctx.drawImage(img, b.x, b.y, b.size, b.size);
          ctx.restore();
        } else {
          // branded fallback — initials with color, not grey placeholder
          const hue = (b.x * 7 + b.y * 13) % 360;
          ctx.fillStyle = `hsl(${hue} 70% 88%)`;
          ctx.fillRect(b.x, b.y, b.size, b.size);
          // initials
          const initials = (b.title || "PX").slice(0, 2).toUpperCase();
          ctx.fillStyle = `hsl(${hue} 60% 28%)`;
          const fontSize = Math.max(7, Math.min(22, b.size * 0.45));
          ctx.font = `800 ${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(initials, b.x + b.size / 2, b.y + b.size / 2);
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          if (b.status === "pending_review") {
            ctx.fillStyle = "rgba(251,191,36,0.9)";
            ctx.fillRect(b.x, b.y, b.size, 3 / scale);
          }
        }
        // border + subtle inner highlight
        ctx.strokeStyle = b.status === "pending_review" ? "#f59e0b" : "rgba(0,0,0,0.12)";
        ctx.lineWidth = Math.max(1 / scale, 1.2 / scale);
        ctx.strokeRect(b.x + 0.5 / scale, b.y + 0.5 / scale, b.size - 1 / scale, b.size - 1 / scale);
      } else if (b.status === "reserved") {
        ctx.fillStyle = "rgba(255,59,48,0.18)";
        ctx.fillRect(b.x, b.y, b.size, b.size);
        ctx.strokeStyle = "rgba(255,59,48,0.5)";
        ctx.setLineDash([5 / scale, 5 / scale]);
        ctx.lineWidth = 1.5 / scale;
        ctx.strokeRect(b.x, b.y, b.size, b.size);
        ctx.setLineDash([]);
      }
    }

    if (dragStart && dragEnd) {
      const size = Math.max(1, Math.min(Math.abs(dragEnd.x - dragStart.x), Math.abs(dragEnd.y - dragStart.y)));
      const sx = dragStart.x;
      const sy = dragStart.y;
      const ix = Math.max(0, Math.round(dragEnd.x >= dragStart.x ? sx : sx - size));
      const iy = Math.max(0, Math.round(dragEnd.y >= dragStart.y ? sy : sy - size));
      const isOverlap = hasOverlap(ix, iy, size);
      ctx.fillStyle = isOverlap ? "rgba(239,68,68,0.22)" : "rgba(34,197,94,0.22)";
      ctx.fillRect(ix, iy, size, size);
      ctx.strokeStyle = isOverlap ? "#ef4444" : "#16a34a";
      ctx.lineWidth = 2.2 / scale;
      ctx.setLineDash([]);
      ctx.strokeRect(ix, iy, size, size);
      ctx.fillStyle = isOverlap ? "#dc2626" : "#15803d";
      ctx.font = `800 ${13 / scale}px Inter, sans-serif`;
      const label = `${size}×${size} · $${size * size} · ${size * size} pixels`;
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = isOverlap ? "rgba(239,68,68,0.95)" : "rgba(22,163,74,0.95)";
      ctx.fillRect(ix, iy - 18 / scale, tw + 10 / scale, 14 / scale);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, ix + 5 / scale, iy - 7 / scale);
    }

    ctx.restore();
  }, [blocks, config, pan, scale, dragStart, dragEnd, hasOverlap, tick]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      setScale(s => Math.min(4, Math.max(0.35, s + delta)));
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

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }
    if (!dragStart || !dragEnd) return;
    const size = Math.max(1, Math.min(Math.abs(dragEnd.x - dragStart.x), Math.abs(dragEnd.y - dragStart.y)));
    const sx = dragStart.x;
    const sy = dragStart.y;
    const ix = Math.max(0, Math.round(dragEnd.x >= dragStart.x ? sx : sx - size));
    const iy = Math.max(0, Math.round(dragEnd.y >= dragStart.y ? sy : sy - size));
    setDragStart(null);
    setDragEnd(null);
    if (size < 1) return;
    if (hasOverlap(ix, iy, size)) return;
    const finalSize = Math.min(size, 50);
    onSelect({ x: ix, y: iy, size: finalSize, priceCents: priceFor(finalSize) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="inline-flex items-center gap-2 bg-zinc-900 text-white rounded-full px-3 py-1.5">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> LIVE CANVAS
          <span className="opacity-60">1000×1000</span>
          <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{blocks.length} live</span>
        </div>
        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-full p-1">
          <button onClick={() => setScale(s => Math.min(4, s + 0.18))} className="w-7 h-7 grid place-items-center rounded-full hover:bg-zinc-100">＋</button>
          <span className="px-2 font-mono text-xs">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(0.35, s - 0.18))} className="w-7 h-7 grid place-items-center rounded-full hover:bg-zinc-100">－</button>
          <button onClick={() => {
            const el = containerRef.current;
            if (!el) return;
            const w = el.clientWidth, h = el.clientHeight;
            const s = Math.min(w / (config.width + 40), h / (config.height + 40));
            const target = Math.max(0.6, Math.min(1.4, s * 0.98));
            setScale(target);
            setPan({ x: (w - config.width * target) / 2, y: (h - config.height * target) / 2 });
          }} className="px-3 py-1 rounded-full bg-zinc-900 text-white text-xs font-bold">Fit</button>
          <button onClick={() => { setPan({ x: 12, y: 12 }); setScale(0.95); }} className="px-2 py-1 rounded-full hover:bg-zinc-100 text-xs">Reset</button>
        </div>
        <span className="text-zinc-500 hidden lg:inline">Drag to select • Shift+drag to pan • Scroll to zoom</span>
        {hover && (
          <Link href={`/block/${hover.id}`} className="ml-auto inline-flex items-center gap-2 border border-zinc-200 bg-white rounded-full px-3 py-1.5 hover:bg-zinc-50 max-w-[260px]">
            <img src={hover.imageUrl || `https://avatar.vercel.sh/${encodeURIComponent(hover.title || hover.id)}.png`} alt="" className="w-6 h-6 rounded object-cover border border-zinc-200" />
            <span className="font-bold truncate">{hover.title}</span>
            <span className="text-zinc-500 shrink-0">{hover.size}×{hover.size} · {hover.clicks} clicks</span>
          </Link>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative w-full aspect-square sm:aspect-[1.15] bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ touchAction: "none" }}
        />
        <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur border border-zinc-200 rounded-full p-1 shadow">
          {[1,2,3,5,10,20].map(s => (
            <span key={s} className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-900 text-white/0 hidden">x</span>
          ))}
          <span className="px-2.5 py-1 text-xs font-bold text-zinc-600">Tip: drag any square — pay size² × $1</span>
        </div>
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur border border-zinc-200 rounded-xl px-3 py-2 text-xs shadow max-w-[220px]">
          <div className="font-bold">Own a square</div>
          <div className="text-zinc-500 leading-tight">Select → pay via Dodo → live 30 days → clicks tracked on leaderboard</div>
        </div>
      </div>
    </div>
  );
}
