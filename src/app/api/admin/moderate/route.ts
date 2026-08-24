import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";

export async function POST(req: Request) {
  try {
    const { id, action } = await req.json() as { id: string; action: "approve" | "reject" };
    const b = mockStore.blocks.find(x => x.id === id);
    if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (action === "approve") {
      b.status = "active";
      b.rentedAt = new Date().toISOString();
      b.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (action === "reject") {
      b.status = "rejected";
      b.imageUrl = null;
      b.targetUrl = null;
      // refund order
      const o = mockStore.orders.find(x => x.blockId === id);
      if (o) o.status = "refunded";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, block: b });
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const idx = mockStore.blocks.findIndex(b => b.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  mockStore.blocks.splice(idx, 1);
  return NextResponse.json({ ok: true });
}
