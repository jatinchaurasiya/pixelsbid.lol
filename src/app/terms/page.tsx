export default function TermsPage(){
  return (
    <div className="mx-auto max-w-[800px] px-4 py-10 prose prose-zinc">
      <h1>Terms of Service</h1>
      <p className="lead">Effective: August 24, 2026. Domain: pixelsbid.lol (operated as PixelsBid).</p>
      <h2>1. Lease of pixel space</h2>
      <p>You rent a square block of pixel-units on a 1000×1000 canvas. Price = size² × $1 (unit price). Lease is 30 days from approval, non-exclusive, revocable for policy violations.</p>
      <h2>2. Payments</h2>
      <p>Dodo Payments is merchant of record — they collect funds, handle tax (VAT/GST), and issue receipts. We never store card data. Refunds: full if rejected in moderation before live; no refund once live and visible (ad-space norms).</p>
      <h2>3. Moderation</h2>
      <p>We review every image/link before it goes live. We may remove any block that violates our Acceptable Use (sexual content, malware/phishing, chat/invite links, impersonation) without refund if already displayed.</p>
      <h2>4. Overlap & availability</h2>
      <p>Availability is enforced at the DB layer (Postgres EXCLUDE via btree_gist). A reservation locks space for 10 minutes; unpaid reservations expire.</p>
      <h2>5. Limitation</h2>
      <p>Canvas is provided &quot;as is&quot;. We aim for 99.5% uptime; we aggregate metrics (clicks/impressions) on a best-effort basis.</p>
    </div>
  );
}
