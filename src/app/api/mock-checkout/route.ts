import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reservationId = searchParams.get("reservationId");
  const mockId = searchParams.get("mockId");
  if (!reservationId) return NextResponse.json({ error: "reservationId required" }, { status: 400 });

  // Simulate Dodo payment success via internal webhook
  const block = mockStore.blocks.find(b => b.id === reservationId);
  if (!block) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Mark succeeded immediately (mock)
  block.status = "active";
  block.rentedAt = new Date().toISOString();
  block.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const order = mockStore.orders.find(o => o.blockId === reservationId);
  if (order) {
    order.status = "succeeded";
    order.paidAt = new Date().toISOString();
    if (mockId) order.dodoPaymentId = mockId;
  }

  // Redirect to block page
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";
  const base = origin || new URL(req.url).origin;
  return NextResponse.redirect(`${base}/block/${reservationId}?welcome=1`, 302);
}

export async function POST(req: Request) {
  return GET(req);
}
