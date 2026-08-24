import { NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const b = mockStore.blocks.find(x => x.id === id);
  if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
  b.clicks += 1;
  const target = b.targetUrl || "/";
  // ensure protocol
  const url = target.startsWith("http") ? target : `https://${target}`;
  return NextResponse.redirect(url, 302);
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    const b = mockStore.blocks.find(x => x.id === id);
    if (!b) return NextResponse.json({ error: "Not found" }, { status: 404 });
    b.clicks += 1;
    return NextResponse.json({ clicks: b.clicks });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
