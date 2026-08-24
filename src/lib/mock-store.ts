// In-memory fallback when DATABASE_URL is not configured (dev/demo mode)
// Mirrors Postgres logic, including overlap exclusion

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
  unitPriceCents: 100,
  pricingMode: "squared",
  leaseDays: 30,
  minSize: 1,
  maxSize: 50,
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
  visitors = 12483;
  // seed data for demo
  constructor() {
    const now = new Date();
    const seeds: Array<Partial<MockBlock> & Pick<MockBlock, "x" | "y" | "size" | "status" | "priceCents">> = [
      { x: 50, y: 50, size: 20, ownerId: "seed1", status: "active", imageUrl: "https://picsum.photos/seed/a/200", targetUrl: "https://example.com/a", title: "Acme AI", category: "AI", clicks: 3421, impressions: 94000, priceCents: 40000 },
      { x: 120, y: 80, size: 15, ownerId: "seed2", status: "active", imageUrl: "https://picsum.photos/seed/b/200", targetUrl: "https://example.com/b", title: "ShipFast", category: "Tools", clicks: 2103, impressions: 72000, priceCents: 22500 },
      { x: 400, y: 120, size: 18, ownerId: "seed3", status: "active", imageUrl: "https://picsum.photos/seed/c/200", targetUrl: "https://example.com/c", title: "NeonDeploy", category: "DevTools", clicks: 1892, impressions: 61000, priceCents: 32400 },
      { x: 600, y: 300, size: 12, ownerId: "seed4", status: "active", imageUrl: "https://picsum.photos/seed/d/200", targetUrl: "https://example.com/d", title: "PixelCraft", category: "Design", clicks: 982, impressions: 34000, priceCents: 14400 },
      { x: 200, y: 400, size: 10, ownerId: "seed5", status: "active", imageUrl: "https://picsum.photos/seed/e/200", targetUrl: "https://example.com/e", title: "DodoPay", category: "Fintech", clicks: 765, impressions: 28000, priceCents: 10000 },
      { x: 700, y: 600, size: 25, ownerId: "seed6", status: "active", imageUrl: "https://picsum.photos/seed/f/200", targetUrl: "https://example.com/f", title: "MegaBrand", category: "Marketing", clicks: 5102, impressions: 120000, priceCents: 62500 },
      { x: 80, y: 700, size: 8, ownerId: "seed7", status: "active", imageUrl: "https://picsum.photos/seed/g/200", targetUrl: "https://example.com/g", title: "TinyLaunch", category: "AI", clicks: 421, impressions: 15000, priceCents: 6400 },
      { x: 850, y: 80, size: 14, ownerId: "seed8", status: "active", imageUrl: "https://picsum.photos/seed/h/200", targetUrl: "https://example.com/h", title: "Outbid Clone", category: "Social", clicks: 1504, impressions: 48000, priceCents: 19600 },
    ];
    seeds.forEach((s, i) => {
      this.blocks.push({
        id: `seed-${i}`,
        x: s.x,
        y: s.y,
        size: s.size,
        ownerId: s.ownerId!,
        status: s.status as BlockStatus,
        imageUrl: s.imageUrl!,
        targetUrl: s.targetUrl!,
        title: s.title!,
        category: s.category!,
        clicks: s.clicks ?? 0,
        impressions: s.impressions ?? 0,
        priceCents: s.priceCents ?? 0,
        reservedAt: new Date(now.getTime() - 86400000 * (i + 1)).toISOString(),
        reservationExpiresAt: null,
        rentedAt: new Date(now.getTime() - 86400000 * (i + 1)).toISOString(),
        expiresAt: new Date(now.getTime() + 86400000 * (30 - i)).toISOString(),
      });
    });
  }

  priceFor(size: number, config = defaultConfig) {
    if (config.pricingMode === "linear") return size * config.unitPriceCents;
    return size * size * config.unitPriceCents;
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

// Make it globally accessible for API routes (singleton)
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { __mockStore?: MockStore };
  if (!g.__mockStore) g.__mockStore = mockStore;
}
