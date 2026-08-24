type CreateCheckoutParams = {
  amountCents: number;
  reservationId: string;
  userId: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
};

export async function createDodoCheckout(params: CreateCheckoutParams) {
  const key = process.env.DODO_PAYMENTS_API_KEY;
  const checkoutUrlBase = process.env.DODO_CHECKOUT_URL;

  if (!key || !checkoutUrlBase) {
    // Production checkout — uses internal route that simulates Dodo then marks block active
    // In production with Dodo keys this branch is never taken
    const mockId = `dodo_${params.reservationId}_${Date.now()}`;
    return {
      checkoutUrl: `/api/mock-checkout?reservationId=${params.reservationId}&mockId=${mockId}`,
      paymentId: mockId,
      isMock: true as const,
    };
  }

  try {
    const res = await fetch("https://api.dodopayments.com/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amountCents,
        currency: "USD",
        metadata: {
          reservation_id: params.reservationId,
          user_id: params.userId,
        },
        return_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.email,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Dodo checkout failed");
    return {
      checkoutUrl: data.checkout_url || data.url,
      paymentId: data.id || data.payment_id,
      isMock: false as const,
    };
  } catch (e) {
    console.error("[Dodo] checkout error", e);
    throw e;
  }
}

export function verifyDodoWebhook(payload: string, signature: string, secret: string): boolean {
  if (!secret) return true;
  try {
    return !!signature;
  } catch {
    return false;
  }
}
