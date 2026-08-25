// Fallback store — only used when DATABASE_URL is not configured (local preview without Neon).
// In production Neon is authoritative; this mirrors its data so UI still works.

export type BlockStatus = "reserved" | "pending_review" | "active" | "expired" | "rejected";

export interface MockBlock {
  id: string;
  x: number;
  y: number;
  size: number;
  ownerId: string | null;
  status: BlockStatus;
  imageUrl: string | null;
  targetUrl: string | null;
  title: string | null;
  category: string | null;
  clicks: number;
  impressions: number;
  priceCents: number;
  reservedAt: string;
  reservationExpiresAt: string | null;
  rentedAt: string | null;
  expiresAt: string | null;
}

export interface MockOrder {
  id: string;
  blockId: string;
  userId: string;
  dodoPaymentId: string | null;
  amountCents: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
}

export interface CanvasConfig {
  width: number;
  height: number;
  unitPriceCents: number;
  pricingMode: "squared" | "linear";
  leaseDays: number;
  minSize: number;
  maxSize: number;
}

export const defaultConfig: CanvasConfig = {
  width: 1000,
  height: 1000,
  unitPriceCents: 100, // $1.00 per 10x10 block unit (100 pixels)
  pricingMode: "squared",
  leaseDays: 30,
  minSize: 10,
  maxSize: 1000,
};

function rectOverlap(a: MockBlock, b: MockBlock) {
  return !(
    a.x + a.size <= b.x ||
    b.x + b.size <= a.x ||
    a.y + a.size <= b.y ||
    b.y + b.size <= a.y
  );
}

class MockStore {
  blocks: MockBlock[] = [];
  orders: MockOrder[] = [];
  visitors = 1420;
  constructor() {
    // Clean production state — blocks are added when users reserve and pay
  }

  priceFor(size: number, config = defaultConfig) {
    const blocks = Math.max(1, Math.round((size / 10) * (size / 10)));
    return blocks * config.unitPriceCents;
  }

  canPlace(x: number, y: number, size: number): boolean {
    const candidate: MockBlock = {
      id: "candidate",
      x, y, size,
      ownerId: null,
      status: "reserved",
      imageUrl: null,
      targetUrl: null,
      title: null,
      category: null,
      clicks: 0,
      impressions: 0,
      priceCents: 0,
      reservedAt: new Date().toISOString(),
      reservationExpiresAt: null,
      rentedAt: null,
      expiresAt: null,
    };
    const active = this.blocks.filter(b => ["reserved", "pending_review", "active"].includes(b.status));
    return !active.some(b => rectOverlap(b, candidate));
  }

  sweepExpired() {
    const now = new Date();
    for (const b of this.blocks) {
      if (b.status === "reserved" && b.reservationExpiresAt && new Date(b.reservationExpiresAt) < now) {
        b.status = "expired";
      }
      if (b.status === "active" && b.expiresAt && new Date(b.expiresAt) < now) {
        b.status = "expired";
        b.imageUrl = null;
        b.targetUrl = null;
      }
    }
  }

  stats() {
    this.sweepExpired();
    const active = this.blocks.filter(b => b.status === "active");
    const totalArea = defaultConfig.width * defaultConfig.height;
    const used = active.reduce((s, b) => s + b.size * b.size, 0);
    const revenue = active.reduce((s, b) => s + b.priceCents, 0);
    return {
      totalBlocks: active.length,
      totalArea,
      used,
      pct: ((used / totalArea) * 100).toFixed(3),
      revenueCents: revenue,
      visitors: this.visitors + Math.floor(Math.random() * 20),
      liveViewers: 42 + Math.floor(Math.random() * 18),
    };
  }

  leaderboard() {
    return [...this.blocks]
      .filter(b => b.status === "active")
      .sort((a, b) => b.size - a.size || b.priceCents - a.priceCents)
      .slice(0, 50);
  }
}

export const mockStore = new MockStore();

if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { __mockStore?: MockStore };
  if (!g.__mockStore) g.__mockStore = mockStore;
}
