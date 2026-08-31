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

  // Mobile-first interaction states
  const [touchMode, setTouchMode] = useState<"scroll" | "pan">("scroll");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number; hasMoved: boolean } | null>(null);
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

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

  const canvasToWorld = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      return {
        x: (cx - pan.x) / scale,
        y: (cy - pan.y) / scale,
      };
    },
    [pan, scale]
  );

  // Auto-fit function
  const fitToContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w === 0 || h === 0) return;
    const s = Math.min(w / (config.width + 30), h / (config.height + 30));
    const target = Math.max(0.3, Math.min(1.4, s * 0.96));
    setScale(target);
    setPan({
      x: (w - config.width * target) / 2,
      y: (h - config.height * target) / 2,
    });
  }, [config.width, config.height]);

  // Auto-fit on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    fitToContainer();
    const ro = new ResizeObserver(() => fitToContainer());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitToContainer]);

  // Main Canvas Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

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
    if (scale > 0.45) {
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
      const label = `${size}×${size} (${units}b) · $${units}.00`;
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

  // Desktop Mouse Wheel Zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      setScale((s) => Math.min(4, Math.max(0.3, s + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Multi-Touch & Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch start
    if (activeTouchesRef.current.size === 2) {
      const touches = Array.from(activeTouchesRef.current.values());
      const dist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = scale;
      setIsPanning(true);
      setLastPanPoint({
        x: (touches[0].x + touches[1].x) / 2,
        y: (touches[0].y + touches[1].y) / 2,
      });
      return;
    }

    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      hasMoved: false,
    };

    // Desktop modifier key or explicit Pan mode or middle click
    if (e.button === 1 || e.altKey || e.shiftKey || (e.pointerType === "touch" && touchMode === "pan")) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    const world = canvasToWorld(e.clientX, e.clientY);
    const gx = Math.floor(world.x / 10) * 10;
    const gy = Math.floor(world.y / 10) * 10;

    // Check if dragging current selection
    if (
      selection &&
      world.x >= selection.x &&
      world.x < selection.x + selection.size &&
      world.y >= selection.y &&
      world.y < selection.y + selection.size
    ) {
      setIsDraggingSelection(true);
      setLastPanPoint({ x: gx - selection.x, y: gy - selection.y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    activeTouchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle 2-finger pinch zoom & pan
    if (activeTouchesRef.current.size === 2 && pinchStartDistRef.current !== null) {
      const touches = Array.from(activeTouchesRef.current.values());
      const dist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      const scaleDelta = dist / pinchStartDistRef.current;
      const newScale = Math.min(4, Math.max(0.3, pinchStartScaleRef.current * scaleDelta));
      setScale(newScale);

      const midX = (touches[0].x + touches[1].x) / 2;
      const midY = (touches[0].y + touches[1].y) / 2;
      if (lastPanPoint) {
        const dx = midX - lastPanPoint.x;
        const dy = midY - lastPanPoint.y;
        setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      }
      setLastPanPoint({ x: midX, y: midY });
      return;
    }

    if (touchStartRef.current) {
      const dist = Math.hypot(e.clientX - touchStartRef.current.x, e.clientY - touchStartRef.current.y);
      if (dist > 8) {
        touchStartRef.current.hasMoved = true;
      }
    }

    if (isPanning && lastPanPoint) {
      const dx = e.clientX - lastPanPoint.x;
      const dy = e.clientY - lastPanPoint.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isDraggingSelection && selection && lastPanPoint) {
      const world = canvasToWorld(e.clientX, e.clientY);
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

    // Hover track on non-touch devices
    if (e.pointerType !== "touch") {
      const world = canvasToWorld(e.clientX, e.clientY);
      setHoverGridPos({ x: world.x, y: world.y });
      const b = getBlockAt(Math.floor(world.x), Math.floor(world.y));
      setHoverBlock(b);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activeTouchesRef.current.delete(e.pointerId);
    if (activeTouchesRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }

    const start = touchStartRef.current;
    const duration = start ? Date.now() - start.time : 999;
    const isCleanTap = start && !start.hasMoved && duration < 350;

    // Handle Tap Selection (single-tap on touch or click on mouse)
    if (isCleanTap && !isPanning && !isDraggingSelection) {
      const world = canvasToWorld(e.clientX, e.clientY);
      const gx = Math.floor(world.x / 10) * 10;
      const gy = Math.floor(world.y / 10) * 10;

      if (gx >= 0 && gy >= 0 && gx < config.width && gy < config.height) {
        const existing = getBlockAt(world.x, world.y);
        if (existing && existing.status === "active") {
          setHoverBlock(existing);
        } else {
          const initialSize = selection ? selection.size : 20;
          const clampedX = Math.min(config.width - initialSize, Math.max(0, gx));
          const clampedY = Math.min(config.height - initialSize, Math.max(0, gy));

          onSelect({
            x: clampedX,
            y: clampedY,
            size: initialSize,
            priceCents: priceFor(initialSize),
          });
        }
      }
    }

    setIsPanning(false);
    setIsDraggingSelection(false);
    setLastPanPoint(null);
    touchStartRef.current = null;
  };

  const handleSetSize = (newSize: number) => {
    const clampedSize = Math.max(10, Math.min(config.width, Math.round(newSize / 10) * 10));
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

  // Directional Pan Helper
  const panBy = (dx: number, dy: number) => {
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const currentSelectedSize = selection?.size || 20;

  return (
    <div className="flex flex-col gap-3">
      {/* Top Canvas Bar — Responsive across 320px to Desktop */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
        {/* Info & Zoom Controls */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="inline-flex items-center gap-1.5 bg-zinc-950 text-white rounded-full px-3 py-1.5 font-bold shadow-2xs text-[11px] sm:text-xs shrink-0">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span>1000×1000</span>
            <span className="text-zinc-500">•</span>
            <span className="text-amber-400 font-mono">$1/block</span>
          </div>

          {/* Zoom & Fit Controller */}
          <div className="flex items-center gap-0.5 bg-white border border-zinc-200 rounded-full p-0.5 shadow-2xs shrink-0">
            <button
              onClick={() => setScale((s) => Math.min(4, s + 0.18))}
              className="w-7 h-7 grid place-items-center rounded-full hover:bg-zinc-100 font-bold text-sm text-zinc-800 transition"
              title="Zoom In"
              aria-label="Zoom in on canvas"
            >
              ＋
            </button>
            <span className="px-1.5 font-mono text-[11px] font-bold text-zinc-700 select-none">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.max(0.3, s - 0.18))}
              className="w-7 h-7 grid place-items-center rounded-full hover:bg-zinc-100 font-bold text-sm text-zinc-800 transition"
              title="Zoom Out"
              aria-label="Zoom out of canvas"
            >
              －
            </button>
            <button
              onClick={fitToContainer}
              className="px-2.5 py-1 rounded-full bg-zinc-900 text-white text-[11px] font-bold hover:bg-black transition"
            >
              Fit
            </button>
          </div>
        </div>

        {/* Mobile Mode Switcher & Direction Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5">
          {/* Touch Mode Selector (Scroll vs Pan) */}
          <div className="flex bg-zinc-100 p-0.5 rounded-full border border-zinc-200 text-[11px] font-bold sm:hidden">
            <button
              onClick={() => setTouchMode("scroll")}
              className={`px-2.5 py-1 rounded-full transition ${
                touchMode === "scroll"
                  ? "bg-white text-zinc-950 shadow-2xs"
                  : "text-zinc-500"
              }`}
            >
              📜 Scroll
            </button>
            <button
              onClick={() => setTouchMode("pan")}
              className={`px-2.5 py-1 rounded-full transition ${
                touchMode === "pan"
                  ? "bg-zinc-950 text-white shadow-2xs"
                  : "text-zinc-500"
              }`}
            >
              ✋ Pan Grid
            </button>
          </div>

          {/* D-Pad Directional Nav Buttons */}
          <div className="flex items-center gap-0.5 bg-zinc-50 border border-zinc-200 rounded-full p-0.5 shadow-2xs">
            <button
              onClick={() => panBy(60, 0)}
              className="w-6 h-6 rounded-full hover:bg-zinc-200 grid place-items-center text-[10px] text-zinc-700"
              title="Pan Left"
            >
              ◀
            </button>
            <button
              onClick={() => panBy(0, 60)}
              className="w-6 h-6 rounded-full hover:bg-zinc-200 grid place-items-center text-[10px] text-zinc-700"
              title="Pan Up"
            >
              ▲
            </button>
            <button
              onClick={() => panBy(0, -60)}
              className="w-6 h-6 rounded-full hover:bg-zinc-200 grid place-items-center text-[10px] text-zinc-700"
              title="Pan Down"
            >
              ▼
            </button>
            <button
              onClick={() => panBy(-60, 0)}
              className="w-6 h-6 rounded-full hover:bg-zinc-200 grid place-items-center text-[10px] text-zinc-700"
              title="Pan Right"
            >
              ▶
            </button>
          </div>

          {/* Fullscreen Expand Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 shadow-2xs transition"
            title={isFullscreen ? "Exit Fullscreen" : "Expand Canvas Fullscreen"}
          >
            {isFullscreen ? "✕ Close" : "⛶ Expand"}
          </button>
        </div>
      </div>

      {/* Hover Inspector Banner for Active Block */}
      {hoverBlock && hoverBlock.status === "active" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-2.5 flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            {hoverBlock.imageUrl ? (
              <img
                src={hoverBlock.imageUrl}
                alt=""
                className="w-6 h-6 rounded-lg object-contain border border-zinc-100 bg-white shrink-0"
              />
            ) : (
              <span className="w-6 h-6 rounded-lg bg-zinc-900 text-white text-[10px] font-black grid place-items-center shrink-0">
                {(hoverBlock.title || "PX").slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="font-black text-xs text-zinc-950 truncate">
                {hoverBlock.title || "Untitled Block"}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono truncate">
                {hoverBlock.size}×{hoverBlock.size} px · {hoverBlock.clicks} clicks · 📍 ({hoverBlock.x},{hoverBlock.y})
              </div>
            </div>
          </div>

          <Link
            href={`/block/${encodeURIComponent(hoverBlock.id)}`}
            className="bg-zinc-900 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full shrink-0 transition"
          >
            View Block →
          </Link>
        </div>
      )}

      {/* Main Canvas Area & Dynamic Size Presets */}
      <div className="grid lg:grid-cols-[1fr_135px] gap-3">
        {/* Canvas Container */}
        <div
          ref={containerRef}
          className={`relative w-full aspect-square sm:aspect-[1.12] bg-zinc-100 border border-zinc-300 rounded-3xl overflow-hidden shadow-inner select-none ${
            isFullscreen ? "fixed inset-2 z-50 aspect-auto h-[calc(100dvh-16px)] shadow-2xl" : ""
          }`}
        >
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full ${
              isDraggingSelection
                ? "cursor-grabbing"
                : touchMode === "pan"
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-crosshair"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              // Key root fix: Allow natural vertical page scroll on touch unless explicitly in pan mode!
              touchAction: touchMode === "pan" ? "none" : "pan-y",
            }}
          />

          {/* Floating Helper Pill */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:right-auto bg-white/95 backdrop-blur-md border border-zinc-200/90 rounded-2xl sm:rounded-full px-3 py-1 text-[11px] font-bold text-zinc-700 shadow-sm pointer-events-none flex items-center justify-between sm:justify-start gap-2">
            <span>💡 Tap open spot to select</span>
            <span className="text-zinc-300 hidden sm:inline">•</span>
            <span className="hidden sm:inline">2 fingers to pinch/pan</span>
            {isFullscreen && (
              <button
                onClick={() => setIsFullscreen(false)}
                className="pointer-events-auto sm:hidden text-xs bg-zinc-900 text-white px-2 py-0.5 rounded-md font-bold"
              >
                Close Fullscreen
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Size Column & Mobile Horizontal Bar */}
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[620px] p-2.5 bg-white border border-zinc-200 rounded-3xl shadow-xs no-scrollbar">
          <div className="hidden lg:block border-b border-zinc-100 pb-2 mb-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-zinc-600">
              Size Selection
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              10px to 1000px custom
            </div>
          </div>

          {/* Custom Size Input Field */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-2 shrink-0 min-w-[100px] lg:min-w-0">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
              Custom Size
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="10"
                max="1000"
                step="10"
                value={currentSelectedSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 10) {
                    handleSetSize(val);
                  }
                }}
                className="w-full bg-white border border-zinc-200 rounded-xl px-2 py-1 text-xs font-mono font-bold text-zinc-900 text-center focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <span className="text-[10px] font-bold text-zinc-500">px</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          {[
            { size: 10, label: "10×10", price: "$1", blocks: 1 },
            { size: 20, label: "20×20", price: "$4", blocks: 4 },
            { size: 30, label: "30×30", price: "$9", blocks: 9 },
            { size: 40, label: "40×40", price: "$16", blocks: 16 },
            { size: 50, label: "50×50", price: "$25", blocks: 25 },
            { size: 80, label: "80×80", price: "$64", blocks: 64 },
            { size: 100, label: "100×100", price: "$100", blocks: 100 },
            { size: 150, label: "150×150", price: "$225", blocks: 225 },
            { size: 200, label: "200×200", price: "$400", blocks: 400 },
            { size: 300, label: "300×300", price: "$900", blocks: 900 },
            { size: 500, label: "500×500", price: "$2,500", blocks: 2500 },
          ].map((preset) => {
            const isCurrent = selection?.size === preset.size;
            return (
              <button
                key={preset.size}
                onClick={() => handleSetSize(preset.size)}
                className={`flex-1 lg:flex-none flex flex-col items-center justify-center p-2 rounded-xl border transition text-center shrink-0 min-w-[70px] lg:min-w-0 ${
                  isCurrent
                    ? "bg-zinc-950 text-white border-zinc-950 shadow-md ring-2 ring-red-500"
                    : "bg-zinc-50/70 hover:bg-zinc-100 border-zinc-200/90 text-zinc-900"
                }`}
              >
                <span className="font-black text-xs">{preset.label}</span>
                <span
                  className={`text-[10px] font-bold mt-0.5 ${
                    isCurrent ? "text-amber-400" : "text-zinc-500"
                  }`}
                >
                  {preset.price}
                </span>
              </button>
            );
          })}

          {/* Quick Stepper Buttons */}
          <div className="grid grid-cols-2 gap-1 mt-auto pt-1.5 border-t border-zinc-100 shrink-0 min-w-[100px] lg:min-w-0">
            <button
              onClick={() => handleSetSize(currentSelectedSize - 10)}
              className="py-1 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[10px] font-bold text-zinc-700 text-center"
              title="Decrease size by 10px"
            >
              -10px
            </button>
            <button
              onClick={() => handleSetSize(currentSelectedSize + 10)}
              className="py-1 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-[10px] font-bold text-zinc-700 text-center"
              title="Increase size by 10px"
            >
              +10px
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
