export default function RulesPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-10 prose prose-zinc">
      <h1 className="text-3xl font-black tracking-tight">How PixelsBid Works</h1>
      <p className="text-zinc-600">The rules of the internet billboard are simple, transparent, and competitive.</p>

      <h2>1. The Pricing Formula</h2>
      <ul>
        <li><b>$1.00 per 10×10 block unit (100 pixels).</b> Choose any square dimension in multiples of 10.</li>
        <li>Price = <b>(size / 10)² × $1.00 USD</b>.</li>
        <li>Examples: 10×10 (1 block) = $1.00 · 20×20 (4 blocks) = $4.00 · 30×30 (9 blocks) = $9.00 · 50×50 (25 blocks) = $25.00 · 100×100 (100 blocks) = $100.00.</li>
        <li>Every purchase grants an active <b>30-day lease</b> with live click and impression tracking.</li>
      </ul>

      <h2>2. Square Selection & Reservation</h2>
      <ul>
        <li>Squares are selected on the 1000×1000 live canvas (1,000,000 pixels total).</li>
        <li>Once you click reserve, your spot is <b>locked for 10 minutes</b> so nobody else can take it while you complete checkout.</li>
        <li>Zero overlaps: your coordinates are completely exclusive during your lease.</li>
      </ul>

      <h2>3. The Leaderboard & Outbidding</h2>
      <ul>
        <li>Leaderboard ranks blocks by <b>square size</b> ($size^2$) and attention volume.</li>
        <li>The largest physical squares dominate the top ranks and receive primary homepage attention.</li>
        <li>Anyone can outbid the current #1 by claiming a larger square on the canvas.</li>
      </ul>

      <h2>4. Content Policy & Safety</h2>
      <ul>
        <li>All links and images go live immediately after checkout and are verified for compliance.</li>
        <li>No malware, phishing, explicit, or deceptive content. Non-compliant blocks will be removed.</li>
      </ul>

      <h2>5. Lease Renewal</h2>
      <ul>
        <li>You can renew your square anytime from your dashboard before the 30-day lease expires.</li>
        <li>If unrenewed, the square automatically returns to the open canvas for other buyers to claim.</li>
      </ul>
    </div>
  );
}

