"use client";
import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { useState } from "react";

export default function Navbar() {
  const { data: session, isPending } = useSession();
  const [mobile, setMobile] = useState(false);
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-zinc-200">
      <div className="mx-auto max-w-[1400px] px-4 h-[56px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="PixelBids"
              className="w-8 h-8 rounded-lg object-contain group-hover:scale-105 transition shrink-0"
            />
            <span className="font-black tracking-tight text-[19px]">
              pixelbids<span className="text-[#ff3b30]">.lol</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link href="/" className="px-3 py-1.5 rounded-full hover:bg-zinc-100">Canvas</Link>
            <Link href="/today" className="px-3 py-1.5 rounded-full bg-red-50 text-red-600 font-bold hover:bg-red-100 flex items-center gap-1">
              <span>Today</span>
              <span className="text-xs">🔥</span>
            </Link>
            <Link href="/leaderboard" className="px-3 py-1.5 rounded-full hover:bg-zinc-100">Leaderboard</Link>
            <Link href="/stats" className="px-3 py-1.5 rounded-full hover:bg-zinc-100">Stats</Link>
            <Link href="/rules" className="px-3 py-1.5 rounded-full hover:bg-zinc-100">Rules</Link>
            <Link href="/about" className="px-3 py-1.5 rounded-full hover:bg-zinc-100">About</Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/#canvas-section"
            className="hidden sm:inline-flex bg-[#ff3b30] hover:bg-[#e5352c] text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-full shadow-xs transition"
          >
            Claim pixels
          </Link>
          {!isPending && (
            user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex items-center gap-2 border border-zinc-200 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium hover:bg-zinc-50 transition"
                >
                  <img
                    src={user.image || `https://i.pravatar.cc/100?u=${user.email}`}
                    alt="avatar"
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover"
                  />
                  <span className="max-w-[80px] sm:max-w-[100px] truncate">{user.name || user.email}</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="hidden sm:inline-block text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full hover:bg-zinc-100 transition text-zinc-600 hover:text-zinc-900"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex border border-zinc-200 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold hover:bg-zinc-50 transition"
              >
                Sign in
              </Link>
            )
          )}
          <button
            onClick={() => setMobile(!mobile)}
            aria-label="Toggle Navigation Menu"
            className="md:hidden p-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 transition"
          >
            {mobile ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {mobile && (
        <div className="md:hidden border-t border-zinc-200 bg-white/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-1 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/"
            onClick={() => setMobile(false)}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-zinc-100 text-sm font-bold text-zinc-900"
          >
            <span>Canvas Billboard</span>
            <span className="text-xs text-zinc-400">1000×1000</span>
          </Link>
          <Link
            href="/today"
            onClick={() => setMobile(false)}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm"
          >
            <span>Today&apos;s Leaderboard 🔥</span>
            <span className="text-xs bg-red-100 px-2 py-0.5 rounded-full">Live</span>
          </Link>
          <Link
            href="/leaderboard"
            onClick={() => setMobile(false)}
            className="py-2.5 px-3 rounded-xl hover:bg-zinc-100 text-sm font-bold text-zinc-900"
          >
            Top Titans
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setMobile(false)}
            className="py-2.5 px-3 rounded-xl hover:bg-zinc-100 text-sm font-bold text-zinc-900"
          >
            My Billboard Dashboard
          </Link>
          <div className="grid grid-cols-3 gap-1 pt-1 text-center">
            <Link
              href="/stats"
              onClick={() => setMobile(false)}
              className="py-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-700"
            >
              Stats
            </Link>
            <Link
              href="/rules"
              onClick={() => setMobile(false)}
              className="py-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-700"
            >
              Rules
            </Link>
            <Link
              href="/about"
              onClick={() => setMobile(false)}
              className="py-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-700"
            >
              About
            </Link>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-100 flex flex-col gap-2">
            <Link
              href="/#canvas-section"
              onClick={() => setMobile(false)}
              className="w-full bg-[#ff3b30] hover:bg-[#e5352c] text-white py-3 rounded-2xl font-black text-sm text-center shadow-md"
            >
              Claim Pixel Spot on Grid →
            </Link>
            {user ? (
              <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-2xl">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={user.image || `https://i.pravatar.cc/100?u=${user.email}`}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <span className="text-xs font-bold truncate text-zinc-900">{user.name || user.email}</span>
                </div>
                <button
                  onClick={() => { signOut(); setMobile(false); }}
                  className="text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                onClick={() => setMobile(false)}
                className="w-full border border-zinc-200 bg-white hover:bg-zinc-50 py-2.5 rounded-2xl font-bold text-xs text-zinc-900 text-center"
              >
                Sign In / Create Account
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
