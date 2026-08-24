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
              alt="PixelsBid"
              className="w-8 h-8 rounded-lg object-contain group-hover:scale-105 transition shrink-0"
            />
            <span className="font-black tracking-tight text-[19px]">
              pixelsbid<span className="text-[#ff3b30]">.lol</span>
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
          <Link href="/#canvas-section" className="hidden sm:inline-flex bg-[#ff3b30] hover:bg-[#e5352c] text-white text-sm font-bold px-4 py-2 rounded-full shadow-xs">Claim pixels</Link>
          {!isPending && (
            user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="hidden sm:inline-flex items-center gap-2 border border-zinc-200 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-zinc-50">
                  <img src={user.image || `https://i.pravatar.cc/100?u=${user.email}`} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
                  <span className="max-w-[100px] truncate">{user.name || user.email}</span>
                </Link>
                <button onClick={() => signOut()} className="text-sm font-medium px-3 py-1.5 rounded-full hover:bg-zinc-100">Sign out</button>
              </div>
            ) : (
              <Link href="/sign-in" className="inline-flex border border-zinc-200 rounded-full px-4 py-2 text-sm font-bold hover:bg-zinc-50">Sign in</Link>
            )
          )}
          <button onClick={() => setMobile(!mobile)} className="md:hidden p-2 rounded-lg hover:bg-zinc-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>
      {mobile && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 py-3 flex flex-col gap-2 text-sm font-medium">
          <Link href="/" onClick={() => setMobile(false)}>Canvas</Link>
          <Link href="/today" onClick={() => setMobile(false)} className="text-red-600 font-bold">Today 🔥</Link>
          <Link href="/leaderboard" onClick={() => setMobile(false)}>Leaderboard</Link>
          <Link href="/stats" onClick={() => setMobile(false)}>Stats</Link>
          <Link href="/rules" onClick={() => setMobile(false)}>Rules</Link>
          <Link href="/about" onClick={() => setMobile(false)}>About</Link>
          <Link href="/dashboard" onClick={() => setMobile(false)}>Dashboard</Link>
          <Link href="/admin" onClick={() => setMobile(false)}>Admin</Link>
        </div>
      )}
    </header>
  );
}
