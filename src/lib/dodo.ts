import { DodoPayments } from "dodopayments";
import { Webhook } from "standardwebhooks";

export type CreateCheckoutParams = {
  amountCents: number;
  reservationId: string;
  userId: string;
  name?: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
};

export async function createDodoCheckout(params: CreateCheckoutParams) {
  const key = process.env.DODO_PAYMENTS_API_KEY;
  const env = (process.env.DODO_PAYMENTS_ENVIRONMENT || "live_mode") as "live_mode" | "test_mode";
  const productId = process.env.DODO_PRODUCT_ID || "pdt_0Nm6BMf8XuGYwAUu6bioW";

  if (!key) {
    // Local dev preview without Dodo API keys — uses mock checkout simulator
    const mockId = `dodo_${params.reservationId}_${Date.now()}`;
    return {
      checkoutUrl: `/api/mock-checkout?reservationId=${encodeURIComponent(params.reservationId)}&mockId=${encodeURIComponent(mockId)}`,
      paymentId: mockId,
      isMock: true as const,
    };
  }

  try {
    const client = new DodoPayments({
      bearerToken: key,
      environment: env,
    });

    const quantity = Math.max(1, Math.round(params.amountCents / 100));

    const payment = await client.payments.create({
      billing: {
        country: "US",
      },
      customer: {
        email: params.email || "advertiser@pixelsbid.lol",
        name: params.name || "PixelsBid Advertiser",
      },
      payment_link: true,
      product_cart: [
        {
          product_id: productId,
          quantity,
        },
      ],
      return_url: params.successUrl,
      metadata: {
        reservation_id: params.reservationId,
        user_id: params.userId || "anon",
      },
    });

    const checkoutUrl = payment.payment_link;
    const paymentId = payment.payment_id;

    if (!checkoutUrl) {
      throw new Error("Dodo response did not contain a payment link URL");
    }

    return {
      checkoutUrl,
      paymentId,
      isMock: false as const,
    };
  } catch (e) {
    console.error("[Dodo] checkout creation error:", e);
    throw e;
  }
}

export function verifyDodoWebhookHeaders(
  payload: string,
  headers: Record<string, string | string[] | undefined>,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.DODO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Dodo Webhook] DODO_WEBHOOK_SECRET is not configured in production!");
      return false;
    }
    console.warn("[Dodo Webhook] DODO_WEBHOOK_SECRET missing; skipping verification in dev mode");
    return true;
  }

  try {
    const wh = new Webhook(webhookSecret);
    const normalizedHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === "string") {
        normalizedHeaders[k.toLowerCase()] = v;
      } else if (Array.isArray(v) && v[0]) {
        normalizedHeaders[k.toLowerCase()] = v[0];
      }
    }
    wh.verify(payload, normalizedHeaders);
    return true;
  } catch (err) {
    console.error("[Dodo Webhook] Cryptographic verification failed:", err instanceof Error ? err.message : err);
    return false;
  }
}


