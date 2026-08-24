import { NextResponse } from "next/server";
import { secureTimingCompare, checkRateLimit } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const rate = checkRateLimit(`admin_verify_${ip}`, 10, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait 1 minute." }, { status: 429 });
    }

    const { secret } = await req.json() as { secret?: string };
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "ADMIN_SECRET is not configured on the server." }, { status: 500 });
      }
      // Dev mode default allow if no secret set
      return NextResponse.json({ ok: true, devMode: true });
    }

    if (!secret || !secureTimingCompare(secret.trim(), adminSecret.trim())) {
      return NextResponse.json({ error: "Invalid Admin Secret Key." }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/verify] Error:", err);
    return NextResponse.json({ error: "Verification error" }, { status: 500 });
  }
}
