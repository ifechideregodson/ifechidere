import crypto from "node:crypto";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeApiUrl = "https://api.stripe.com/v1";

export function isStripeConfigured() { return Boolean(stripeSecretKey); }

export async function createCheckoutSession(input: { orderId: string; amountCents: number; currency: string; productName: string; successUrl: string; cancelUrl: string; customerEmail?: string }) {
  if (!stripeSecretKey) throw new Error("Stripe is not configured");
  const body = new URLSearchParams({ mode: "payment", "line_items[0][price_data][currency]": input.currency.toLowerCase(), "line_items[0][price_data][product_data][name]": input.productName, "line_items[0][price_data][unit_amount]": String(input.amountCents), "line_items[0][quantity]": "1", success_url: input.successUrl, cancel_url: input.cancelUrl, "metadata[order_id]": input.orderId });
  if (input.customerEmail) body.set("customer_email", input.customerEmail);
  const response = await fetch(`${stripeApiUrl}/checkout/sessions`, { method: "POST", headers: { Authorization: `Bearer ${stripeSecretKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
  const data = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !data.id || !data.url) throw new Error(data.error?.message ?? "Stripe checkout session failed");
  return { id: data.id, url: data.url };
}

export function verifyStripeSignature(payload: Buffer, signature: string, secret: string) {
  const timestamp = signature.split(",").find((part) => part.startsWith("t="))?.slice(2);
  const signatures = signature.split(",").filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload.toString("utf8")}`).digest("hex");
  return signatures.some((candidate) => candidate.length === expected.length && crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected)));
}
