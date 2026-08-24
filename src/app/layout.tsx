import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PixelsBid.lol — Rent pixels. Own the canvas. $1 per pixel.",
  description: "A live 1000×1000 canvas where anyone can rent a square block for 30 days. $1 per pixel, size² pricing, biggest pixels rank the leaderboard.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://pixelsbid.lol"),
  openGraph: {
    title: "PixelsBid.lol — Rent pixels. Own the canvas.",
    description: "1000×1000 live canvas. Rent a square, showcase your product, track clicks. Biggest pixels win the leaderboard.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "PixelsBid.lol", description: "Rent pixels. Own the canvas." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#fcfcfc]`}>
        <Navbar />
        {children}
        <footer className="border-t border-zinc-200 bg-white mt-16">
          <div className="mx-auto max-w-[1400px] px-4 py-10 grid sm:grid-cols-4 gap-8 text-sm">
            <div>
              <div className="font-black">pixelsbid.lol</div>
              <div className="text-zinc-500 mt-2">A rentable pixel canvas inspired by Million Dollar Homepage + outbid.lol — but with real ownership, time-boxed leases, and a biggest-pixel leaderboard.</div>
            </div>
            <div>
              <div className="font-bold">Product</div>
              <ul className="mt-2 space-y-1 text-zinc-600">
                <li><Link href="/" className="hover:underline">Canvas</Link></li>
                <li><Link href="/leaderboard" className="hover:underline">Leaderboard</Link></li>
                <li><Link href="/stats" className="hover:underline">Live stats</Link></li>
                <li><Link href="/dashboard" className="hover:underline">My blocks</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-bold">Info</div>
              <ul className="mt-2 space-y-1 text-zinc-600">
                <li><Link href="/rules" className="hover:underline">Rules</Link></li>
                <li><Link href="/about" className="hover:underline">About</Link></li>
                <li><Link href="/terms" className="hover:underline">Terms</Link></li>
                <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-bold">Ops</div>
              <ul className="mt-2 space-y-1 text-zinc-600">
                <li><Link href="/admin" className="hover:underline">Admin</Link></li>
                <li><Link href="/refund" className="hover:underline">Refund policy</Link></li>
                <li className="text-zinc-400">Payments by Dodo Payments (MoR) · DB Neon · Hosted on Vercel</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-100 text-center text-xs text-zinc-500 py-4">© 2026 PixelsBid.lol — All pixels rented are time-boxed 30-day leases. No overlap guaranteed at DB layer.</div>
        </footer>
      </body>
    </html>
  );
}
