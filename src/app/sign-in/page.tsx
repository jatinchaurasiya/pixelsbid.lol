"use client";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await signIn.email({ email, password });
      if ((res as unknown as { error?: { message?: string } })?.error) {
        setMsg((res as unknown as { error: { message: string }}).error.message);
      } else {
        setMsg("Signed in! Redirecting…");
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Sign-in failed");
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    await signIn.social({ provider: "google", callbackURL: "/dashboard" });
  };

  return (
    <div className="mx-auto max-w-[480px] px-4 py-12">
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-black">Sign in to PixelsBid</h1>
        <p className="text-sm text-zinc-600 mt-1">Google OAuth + email magic link (Better Auth, Neon-backed).</p>

        <button onClick={handleGoogle} className="mt-6 w-full flex items-center justify-center gap-2 border border-zinc-200 rounded-full py-3 font-bold hover:bg-zinc-50">
          <span className="w-5 h-5 rounded-full bg-white border grid place-items-center text-xs">G</span> Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
          <div className="flex-1 h-px bg-zinc-200" /> or <div className="flex-1 h-px bg-zinc-200" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" type="email" required className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (or magic link)" type="password" className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          <button disabled={loading} className="w-full bg-zinc-900 text-white rounded-full py-3 font-bold hover:bg-black disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in with email"}
          </button>
        </form>

        {msg && <div className="mt-4 text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">{msg}</div>}

        <div className="mt-6 text-xs text-zinc-500">
          Don&apos;t have an account? Just sign in — we&apos;ll create one. Demo mode works without DB (in-memory).
        </div>
      </div>
    </div>
  );
}
