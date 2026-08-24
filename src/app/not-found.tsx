import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-[#ff3b30] flex items-center justify-center text-white font-black text-2xl mb-4 shadow-sm">
        404
      </div>
      <h1 className="text-3xl font-black tracking-tight">Pixel Block Not Found</h1>
      <p className="mt-2 text-sm text-zinc-600 max-w-md">
        The square or page you are looking for does not exist or its lease has expired back to the open canvas.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="bg-zinc-900 text-white rounded-full px-6 py-2.5 text-sm font-bold hover:bg-black transition">
          Back to Live Canvas
        </Link>
        <Link href="/leaderboard" className="border border-zinc-200 bg-white rounded-full px-6 py-2.5 text-sm font-bold hover:bg-zinc-50 transition">
          View Leaderboard
        </Link>
      </div>
    </div>
  );
}
