import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";

export async function GET(req: Request) {
  // Allow Vercel Cron or manual trigger; check secret if set
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    // also allow without auth in dev
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const before = mockStore.blocks.length;
  mockStore.sweepExpired();
  const expired = mockStore.blocks.filter(b => b.status === "expired").length;
  return NextResponse.json({ ok: true, swept: true, expired, total: mockStore.blocks.length });
}
