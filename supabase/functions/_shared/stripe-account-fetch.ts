/**
 * Minimal Stripe Account retrieve — avoids loading the full Stripe SDK in Edge (memory / 546 limits).
 * @see https://stripe.com/docs/api/accounts/retrieve
 */
export async function fetchStripeConnectAccountFlags(accountId: string): Promise<{
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
}> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");

  const res = await fetch(
    `https://api.stripe.com/v1/accounts/${encodeURIComponent(accountId)}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe accounts.retrieve failed: ${res.status} ${text.slice(0, 240)}`);
  }

  const json = (await res.json()) as {
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    details_submitted?: boolean;
  };

  return {
    charges_enabled: json.charges_enabled ?? false,
    payouts_enabled: json.payouts_enabled ?? false,
    details_submitted: json.details_submitted ?? false,
  };
}
