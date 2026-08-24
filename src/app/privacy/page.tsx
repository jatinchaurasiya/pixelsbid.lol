export default function PrivacyPage(){
  return (
    <div className="mx-auto max-w-[800px] px-4 py-10 prose prose-zinc">
      <h1>Privacy Policy</h1>
      <p>We collect: email, name, avatar (via Better Auth / Google OAuth), payment metadata (via Dodo), and canvas interactions (clicks, impressions). We store data in Neon Postgres (EU/US regions per Neon). We use cookies for sessions only.</p>
      <h2>What we don&apos;t do</h2>
      <ul>
        <li>No sale of personal data.</li>
        <li>No card storage — Dodo handles PCI.</li>
        <li>Analytics is decoupled and anonymized; it can fail without affecting checkout.</li>
      </ul>
      <h2>Contact</h2>
      <p>Email: privacy@pixelsbid.lol — we respond within 7 days. You can request deletion of your blocks and account.</p>
    </div>
  );
}
