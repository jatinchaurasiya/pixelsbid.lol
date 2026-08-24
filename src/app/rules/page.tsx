export default function RulesPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-10 prose prose-zinc">
      <h1 className="text-3xl font-black tracking-tight">Rules</h1>
      <p className="text-zinc-600">Everything is public — pricing, lease, and moderation.</p>

      <h2>Pricing</h2>
      <ul>
        <li><b>$1 per pixel-unit.</b> You pick a square size. Price = <b>size² × $1</b>. Size 10 = $100, 20 = $400, 25 = $625, 50 = $2,500.</li>
        <li>Price is locked at checkout.</li>
        <li>Lease = <b>30 days</b> from approval.</li>
      </ul>

      <h2>Selection</h2>
      <ul>
        <li>Must be a perfect square — drag is constrained to square.</li>
        <li>Size 1–50. Canvas 1000×1000 = 1,000,000 pixels.</li>
        <li>Overlapping selections are rejected at the UI and at the database (EXCLUDE constraint).</li>
        <li>Confirming creates a <b>10-minute lock</b> so no one can take your spot during checkout.</li>
      </ul>

      <h2>Payments</h2>
      <ul>
        <li>Via <b>Dodo Payments</b> (merchant of record) — global tax included.</li>
        <li>Webhooks are idempotent — retries never double-charge.</li>
      </ul>

      <h2>Review</h2>
      <ul>
        <li>Every block is reviewed before it appears publicly. Under review you see your square reserved; after approval it goes live and starts counting clicks/impressions.</li>
        <li>Violations (sexual, phishing, impersonation) are removed. No refund once live.</li>
      </ul>

      <h2>Renewal</h2>
      <ul>
        <li>Renew anytime before expiry — extends 30 days.</li>
        <li>At expiry the square returns to the pool.</li>
      </ul>

      <h2>Leaderboard</h2>
      <ul>
        <li>Ranked by <b>biggest size first</b>, then price. Largest visible squares win.</li>
      </ul>
    </div>
  );
}
