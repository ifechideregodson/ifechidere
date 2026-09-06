import crypto from "node:crypto";

const secret = process.env.FLUTTERWAVE_SECRET_KEY;
const webhookHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
export function flutterwaveProviderStatus() { return { provider: secret && webhookHash ? "flutterwave" : "unconfigured" }; }

export async function initializeFlutterwave(input: { email: string; amountCents: number; currency: string; callbackUrl: string; orderId: string }) {
  if (!secret) throw new Error("Flutterwave is not configured");
  const response = await fetch("https://api.flutterwave.com/v3/payments", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ tx_ref: `ditrine-${input.orderId}-${crypto.randomUUID()}`, amount: (input.amountCents / 100).toFixed(2), currency: input.currency, redirect_url: input.callbackUrl, customer: { email: input.email }, meta: { order_id: input.orderId } }) });
  const data = await response.json() as { status?: string; message?: string; data?: { link?: string } };
  if (!response.ok || data.status !== "success" || !data.data?.link) throw new Error(data.message ?? "Flutterwave checkout initialization failed");
  return { url: data.data.link };
}

export function verifyFlutterwaveWebhook(signature: string) { return Boolean(webhookHash) && signature.length === webhookHash!.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(webhookHash!)); }
