export default function RefundPage(){
  return (
    <div className="mx-auto max-w-[800px] px-4 py-10 prose prose-zinc">
      <h1>Refund Policy</h1>
      <ul>
        <li><b>Before going live:</b> If your block is rejected in moderation before public display, you get a <b>full refund</b> via Dodo.</li>
        <li><b>After going live:</b> No refunds once a block has been publicly visible — this is leased ad space, not a physical good.</li>
        <li><b>Duplicate/failed payments:</b> Idempotent webhooks prevent double charges; if a double charge occurs we refund within 5 business days.</li>
        <li><b>Takendown for policy violation:</b> No refund if removed for violating Rules/Acceptable Use after going live.</li>
      </ul>
      <p>Contact: support@pixelsbid.lol with your block ID and payment ID.</p>
    </div>
  );
}
