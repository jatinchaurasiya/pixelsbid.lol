import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PixelBids.lol — Buy pixels. Outbid the rest. Get noticed.",
  description: "A live 1000×1000 internet billboard. Claim your square, upload your brand, and outbid competitors for top leaderboard traffic.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://pixelbids.lol"),
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo.png", type: "image/png" }
    ],
    apple: "/logo.png",
  },
  openGraph: {
    title: "PixelBids.lol — The 1,000,000 Pixel Billboard",
    description: "1000×1000 live canvas. Rent a square, showcase your product, track clicks. Biggest pixels win the leaderboard.",
    type: "website",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "PixelBids.lol",
    description: "Buy pixels. Outbid the rest. Get noticed.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#fcfcfc]`}>
        <Navbar />
        {children}
        <footer className="border-t border-zinc-200 bg-white mt-16">
          <div className="mx-auto max-w-[1400px] px-4 py-12 grid sm:grid-cols-4 gap-8 text-sm">
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <img src="/logo.png" alt="PixelBids" className="w-7 h-7 rounded-lg object-contain" />
                <span className="font-black text-lg tracking-tight">pixelbids<span className="text-[#ff3b30]">.lol</span></span>
              </Link>
              <div className="text-zinc-500 text-xs mt-3 leading-relaxed">
                The 1,000,000 pixel billboard combining the timeless spatial real estate of the Million Dollar Homepage with the viral pay-to-rank velocity of outbid.lol.
              </div>
            </div>
            <div>
              <div className="font-bold text-zinc-900">Product</div>
              <ul className="mt-3 space-y-2 text-xs text-zinc-600">
                <li><Link href="/" className="hover:underline">Live Grid</Link></li>
                <li><Link href="/leaderboard" className="hover:underline">Leaderboard</Link></li>
                <li><Link href="/stats" className="hover:underline">Live Stats</Link></li>
                <li><Link href="/dashboard" className="hover:underline">My Blocks</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-bold text-zinc-900">Info</div>
              <ul className="mt-3 space-y-2 text-xs text-zinc-600">
                <li><Link href="/rules" className="hover:underline">How it Works</Link></li>
                <li><Link href="/about" className="hover:underline">About</Link></li>
                <li><Link href="/terms" className="hover:underline">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-bold text-zinc-900">Account & Help</div>
              <ul className="mt-3 space-y-2 text-xs text-zinc-600">
                <li><Link href="/sign-in" className="hover:underline">Sign In / Dashboard</Link></li>
                <li><Link href="/refund" className="hover:underline">Refund Policy</Link></li>
                <li><Link href="/admin" className="hover:underline">Admin Portal</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-100 text-center text-xs text-zinc-500 py-4">
            © 2026 PixelBids.lol — All pixels rented are active 30-day exclusive placements.
          </div>
        </footer>
      </body>
    </html>
  );
}
