"use client";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";
import Link from "next/link";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setMsg({ text: "Please enter your full name or project handle.", type: "error" });
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setMsg({ text: "Password must be at least 6 characters long.", type: "error" });
          setLoading(false);
          return;
        }

        const res = await signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
        });

        if ((res as unknown as { error?: { message?: string } })?.error) {
          const errMsg = (res as unknown as { error: { message: string } }).error.message;
          setMsg({ text: errMsg || "Registration failed. Email might already exist.", type: "error" });
        } else {
          setMsg({ text: "Account created successfully! Redirecting…", type: "success" });
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 800);
        }
      } else {
        const res = await signIn.email({
          email: email.trim(),
          password,
        });

        if ((res as unknown as { error?: { message?: string } })?.error) {
          const errMsg = (res as unknown as { error: { message: string } }).error.message;
          setMsg({ text: errMsg || "Invalid email or password. Please check and try again.", type: "error" });
        } else {
          setMsg({ text: "Signed in! Redirecting to your dashboard…", type: "success" });
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 600);
        }
      }
    } catch (err: unknown) {
      setMsg({
        text: err instanceof Error ? err.message : "Authentication failed. Please check your credentials.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    } catch {
      setMsg({ text: "Google sign-in is not configured yet. Please sign in with email.", type: "error" });
    }
  };

  return (
    <div className="mx-auto max-w-[480px] px-4 py-12 sm:py-16">
      <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
        {/* Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="PixelsBid" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-black text-xl tracking-tight">
              pixelsbid<span className="text-[#ff3b30]">.lol</span>
            </span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            {mode === "signin"
              ? "Sign in to manage your active pixel leases and click analytics"
              : "Register to claim pixel billboard spots and track real-time traffic"}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-zinc-100 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              mode === "signin"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              mode === "signup"
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                Full Name / Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Satoshi Nakamoto / Acme SaaS"
                className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:outline-none transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Min. 6 characters" : "••••••••"}
              className="w-full border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff3b30] hover:bg-[#e5352c] text-white rounded-2xl py-3.5 font-bold text-sm transition shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                {mode === "signin" ? "Signing In…" : "Creating Account…"}
              </span>
            ) : mode === "signin" ? (
              "Sign In →"
            ) : (
              "Create Account & Proceed →"
            )}
          </button>
        </form>

        {/* Status / Error Alert */}
        {msg && (
          <div
            className={`mt-4 rounded-2xl p-3.5 text-xs font-semibold leading-relaxed ${
              msg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Social Divider */}
        <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
          <div className="flex-1 h-px bg-zinc-100" />
          <span>or continue with</span>
          <div className="flex-1 h-px bg-zinc-100" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-2.5 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-2xl py-3 text-xs font-bold text-zinc-700 transition shadow-2xs"
        >
          <span className="w-4 h-4 rounded-full bg-white border border-zinc-200 grid place-items-center text-[10px] font-black">
            G
          </span>
          Continue with Google
        </button>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-zinc-400">
          By continuing, you agree to the{" "}
          <Link href="/terms" className="text-zinc-600 underline hover:text-zinc-900">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-zinc-600 underline hover:text-zinc-900">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
