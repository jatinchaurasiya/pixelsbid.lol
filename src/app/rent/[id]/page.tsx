"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

export default function RentPage() {
  const params = useParams() as { id: string };
  const id = params.id;
  const [block, setBlock] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ title: "", targetUrl: "", imageUrl: "", category: "AI", email: "" });
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("paid") === "1") setPaid(true);

    fetch(`/api/reservations?id=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setErrorMsg(data.error);
        } else {
          setBlock(data);
          if (data.title) setForm(f => ({ ...f, title: data.title }));
          if (data.targetUrl) setForm(f => ({ ...f, targetUrl: data.targetUrl }));
          if (data.imageUrl) setForm(f => ({ ...f, imageUrl: data.imageUrl }));
          if (data.category) setForm(f => ({ ...f, category: data.category }));
        }
      })
      .catch(() => {
        setErrorMsg("Failed to load reservation details");
      });
  }, [id]);

  // Live countdown timer for reservation hold
  useEffect(() => {
    if (!block?.reservationExpiresAt) return;
    const expiresAt = new Date(block.reservationExpiresAt as string).getTime();
    if (isNaN(expiresAt)) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiresAt - now;
      if (diff <= 0) {
        setTimeLeft("00:00 (Expired)");
        setIsExpired(true);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [block?.reservationExpiresAt]);

  const checkout = async () => {
    setErrorMsg(null);
    if (!form.title.trim()) {
      setErrorMsg("Please enter a project or brand title.");
      return;
    }
    if (!form.targetUrl.trim()) {
      setErrorMsg("Please enter a target destination URL.");
      return;
    }

    let formattedUrl = form.targetUrl.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setLoading(true);
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: id,
          title: form.title.trim(),
          targetUrl: formattedUrl,
          imageUrl: form.imageUrl.trim() || null,
          category: form.category,
          email: form.email.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Checkout initiation failed");
      if (j.checkoutUrl) {
        window.location.href = j.checkoutUrl;
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to launch checkout");
    } finally {
      setLoading(false);
    }
  };

  if (paid) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-12">
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center text-3xl mx-auto font-black shadow-sm">
            ✓
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Payment Received!</h1>
          <p className="text-sm text-zinc-600 mt-2 max-w-md mx-auto">
            Your block is confirmed and active on the live canvas. Clicks and impressions are now being tracked.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/block/${encodeURIComponent(id)}`} className="bg-zinc-900 text-white rounded-full px-6 py-3 font-bold hover:bg-black transition">
              View Your Block Page →
            </Link>
            <Link href="/" className="border border-zinc-200 bg-white rounded-full px-6 py-3 font-bold hover:bg-zinc-50 transition">
              Back to Live Canvas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const b = block as unknown as { x: number; y: number; size: number; priceCents: number; reservationExpiresAt: string; status: string } | null;

  return (
    <div className="mx-auto max-w-[950px] px-4 py-8 grid md:grid-cols-[1fr_360px] gap-8">
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Complete Your Rental</h1>
          {timeLeft && (
            <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-full border ${isExpired ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
              ⏱ Hold: {timeLeft}
            </span>
          )}
        </div>

        {b ? (
          <div className="mt-3 text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              Position: <b className="font-mono text-zinc-900">{b.x}, {b.y}</b> · Size: <b className="font-mono text-zinc-900">{b.size}×{b.size}</b> ({b.size * b.size} px)
            </div>
            <div className="text-sm font-bold text-zinc-900">
              Total: <span className="text-[#ff3b30]">{formatCents(b.priceCents)}</span> (30 days)
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-zinc-500 animate-pulse">Loading reservation details…</div>
        )}

        {errorMsg && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-3.5">
            {errorMsg}
          </div>
        )}

        {isExpired ? (
          <div className="mt-6 text-center p-6 bg-red-50 border border-red-200 rounded-2xl">
            <div className="font-bold text-red-800">Your 10-minute hold has expired.</div>
            <p className="text-xs text-red-600 mt-1">Another user may now claim this space.</p>
            <Link href="/" className="mt-4 inline-block bg-zinc-900 text-white rounded-full px-6 py-2 text-sm font-bold">
              Return to Canvas to Re-select
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">Project / Brand Title *</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Acme AI — Ship Software 10x Faster"
                className="mt-1 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">Target Destination URL *</label>
              <input
                value={form.targetUrl}
                onChange={e => setForm({ ...form, targetUrl: e.target.value })}
                placeholder="https://yourproduct.com"
                className="mt-1 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-white"
              />
            </div>

            {/* Logo / Brand Asset */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-zinc-800">Logo / Brand Asset</label>
                <span className="text-[11px] text-zinc-400">PNG, JPG, SVG (&lt;2MB)</span>
              </div>

              {form.imageUrl ? (
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 flex items-center gap-3 shadow-2xs">
                  <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                    <img
                      src={form.imageUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-zinc-900 truncate">
                        Logo attached
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      Will render inside your active spot on canvas
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, imageUrl: "" })}
                    className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="group flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50 rounded-2xl p-4 cursor-pointer transition text-center">
                    <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 grid place-items-center text-zinc-600 text-sm shadow-2xs group-hover:scale-105 transition">
                      ↑
                    </div>
                    <div className="text-xs font-bold text-zinc-800 mt-2">
                      Click to upload logo image
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          alert("Please upload an image smaller than 2MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setForm((f) => ({ ...f, imageUrl: reader.result as string }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">or URL:</span>
                    <input
                      type="url"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://.../logo.png"
                      className="flex-1 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 bg-zinc-50 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                >
                  <option value="AI">AI & Machine Learning</option>
                  <option value="SaaS">SaaS & Software</option>
                  <option value="DevTools">Developer Tools & APIs</option>
                  <option value="Marketing">Marketing, SEO & Growth</option>
                  <option value="Design">Design & Creative Tools</option>
                  <option value="Fintech">Fintech, Crypto & Web3</option>
                  <option value="Productivity">Productivity & Workflow</option>
                  <option value="Ecommerce">E-commerce & D2C Brands</option>
                  <option value="NoCode">No-Code & Automation</option>
                  <option value="Security">Cybersecurity & Privacy</option>
                  <option value="Media">Media & Newsletters</option>
                  <option value="Community">Community & Social</option>
                  <option value="Other">Other / Launch</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">Email (Receipt)</label>
                <input
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  type="email"
                  className="mt-1 w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:outline-none bg-white"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 leading-relaxed">
              <b>Content Policy:</b> No explicit, malicious, or deceptive content. Ads go live immediately upon payment and are verified by our moderation queue.
            </div>

            <button
              onClick={checkout}
              disabled={loading || !b || isExpired}
              className="w-full bg-[#ff3b30] text-white rounded-full py-4 font-black text-lg hover:bg-[#e5352c] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Redirecting to Secure Checkout…" : `Pay ${b ? formatCents(b.priceCents) : ""} — Secure Checkout →`}
            </button>

            <div className="text-xs text-center text-zinc-500">
              Instant 30-day placement upon payment. Receipts and invoicing handled securely.
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-zinc-900 text-white rounded-3xl p-6 shadow-sm">
          <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold">The Rules of the Game</div>
          <ul className="mt-4 text-sm space-y-3 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span><b>10-Minute Lock:</b> Your selected coordinate is reserved exclusively for you during checkout.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span><b>Exclusive Real Estate:</b> Once purchased, your pixels are 100% locked. No one can overlap your square.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span><b>Leaderboard Ranking:</b> The biggest squares top the leaderboard, driving maximum clicks to your link.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl p-5 text-sm shadow-sm">
          <div className="font-bold">Square Unit Pricing</div>
          <div className="text-zinc-600 text-xs mt-1 leading-relaxed">
            10×10 Block Unit Formula ($1 / 100 pixels):
            <br />• 10×10 = 1 block = $1.00
            <br />• 20×20 = 4 blocks = $4.00
            <br />• 30×30 = 9 blocks = $9.00
            <br />• 50×50 = 25 blocks = $25.00
            <br />• 100×100 = 100 blocks = $100.00
          </div>
        </div>
      </div>
    </div>
  );
}

