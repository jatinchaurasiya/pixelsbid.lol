export default function RulesPage() {
  return (
    <div className="mx-auto max-w-[800px] px-4 py-10 prose prose-zinc">
      <h1 className="text-3xl font-black tracking-tight">Rules — plain and complete</h1>
      <p className="text-zinc-600">We publish everything like outbid.lol does. No hidden fees, no editorial ranking.</p>

      <h2>Pricing</h2>
      <ul>
        <li><b>$1 per pixel-unit.</b> You pick a square size (side length). Price = <b>size² × $1</b>. Size 1 = $1, 2 = $4, 10 = $100, 20 = $400, 50 = $2,500.</li>
        <li>Price is locked at checkout. Future price changes don&apos;t affect active leases.</li>
        <li>Lease = <b>30 days</b> from moderation approval (not from payment initiation).</li>
      </ul>

      <h2>Selection</h2>
      <ul>
        <li>Must be a <b>perfect square</b> — the UI enforces square drag; you can&apos;t make a rectangle.</li>
        <li>Size 1–50 (configurable). Canvas is 1000×1000 = 1,000,000 pixels max inventory.</li>
        <li>You can only select empty space. If your drag overlaps any active/reserved/pending block, it turns red and is rejected.</li>
        <li>On confirm, we place a <b>10-minute reservation</b> backed by a Postgres EXCLUDE constraint — even under concurrent traffic, two people can&apos;t reserve overlapping squares.</li>
      </ul>

      <h2>Payment</h2>
      <ul>
        <li>Checkout via <b>Dodo Payments</b> (merchant of record). They handle global tax/VAT/GST, receipts, and chargebacks.</li>
        <li>Webhook is idempotent (keyed on dodo_payment_id) — retried webhooks can&apos;t double-charge.</li>
        <li>Unpaid reservations auto-expire after 10 minutes and the space is freed.</li>
      </ul>

      <h2>Moderation</h2>
      <ul>
        <li>Every new image goes to <b>pending_review</b> and shows a neutral placeholder on the public canvas until approved.</li>
        <li>Automated flagging + human review. Violations per Acceptable Use: sexual content, phishing/malware, chat/invite links, impersonation.</li>
        <li>Violations = instant takedown, no refund once the block has been live and visible.</li>
      </ul>

      <h2>Renewal & expiry</h2>
      <ul>
        <li>Renew anytime before expiry at current price; expiry extends 30 days.</li>
        <li>At expiry, the block flips to <b>expired</b>, image/link cleared, region returns to pool. Reminders at 3 days and 0 days.</li>
      </ul>

      <h2>Leaderboard</h2>
      <ul>
        <li>Ranked by <b>biggest size first</b>, then price, then earliest. This rewards large, prominent buys.</li>
        <li>There is no editorial boost — money is rank for size, just like outbid&apos;s bid=rank but spatial.</li>
      </ul>
    </div>
  );
}
