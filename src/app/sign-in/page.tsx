"use client";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL || "https://ep-noisy-sunset-ay4d2mrm.neonauth.c-5.us-east-2.aws.neon.tech/neondb/auth";

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
    <div className="mx-auto max-w-[520px] px-4 py-12">
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-black">Sign in to PixelsBid</h1>
        <p className="text-sm text-zinc-600 mt-1">Powered by Neon (Postgres + Auth) + Better Auth.</p>

        <div className="mt-4 grid gap-3">
          <a href={`${neonAuthUrl}/sign-in`} className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white rounded-full py-3 font-bold hover:bg-black">
            <span className="w-6 h-6 rounded-full bg-white text-zinc-900 grid place-items-center text-xs font-black">N</span>
            Continue with Neon Auth
          </a>
          <div className="text-xs text-center text-zinc-500">Hosted at <code className="bg-zinc-100 px-1 py-0.5 rounded">{neonAuthUrl}</code></div>
        </div>

        <button onClick={handleGoogle} className="mt-3 w-full flex items-center justify-center gap-2 border border-zinc-200 rounded-full py-3 font-bold hover:bg-zinc-50">
          <span className="w-5 h-5 rounded-full bg-white border grid place-items-center text-xs">G</span> Continue with Google (Better Auth)
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
          <div className="flex-1 h-px bg-zinc-200" /> or <div className="flex-1 h-px bg-zinc-200" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" type="email" required className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
          <button disabled={loading} className="w-full bg-zinc-900 text-white rounded-full py-3 font-bold hover:bg-black disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in with email"}
          </button>
        </form>

        {msg && <div className="mt-4 text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">{msg}</div>}

        <div className="mt-6 text-xs text-zinc-500 space-y-1">
          <div><b>Neon DB:</b> <code>ep-noisy-sunset-ay4d2mrm.c-5.us-east-2.aws.neon.tech</code> — verified, 8 blocks seeded, btree_gist + EXCLUDE constraint active.</div>
          <div><b>JWKS:</b> <code>{neonAuthUrl}/.well-known/jwks.json</code> — EdDSA Ed25519 — used by <code>/api/auth/neon</code> to verify JWTs.</div>
          <div>Don&apos;t have an account? Just sign in — we&apos;ll create one. Neon Auth users are auto-synced to <code>public.user</code> for FK integrity.</div>
        </div>
      </div>

      <div className="mt-4 bg-white border border-zinc-200 rounded-2xl p-4 text-xs">
        <div className="font-bold">How Neon Auth works here</div>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-zinc-600">
          <li>Click Neon Auth → hosted Stack Auth UI at your Neon project URL</li>
          <li>After login you get a JWT signed with the JWKS Ed25519 key (<code>2fd3edcb…</code>)</li>
          <li>Send it to <code>POST /api/auth/neon</code> with <code>Authorization: Bearer TOKEN</code> — we verify via <code>jose</code> + remote JWKS and upsert into <code>user</code></li>
          <li>Better Auth session cookies still work for email/google; Neon JWT works for API + edge</li>
        </ul>
      </div>
    </div>
  );
}
