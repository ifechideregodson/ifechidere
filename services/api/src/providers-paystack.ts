import crypto from "node:crypto";

const secret = process.env.PAYSTACK_SECRET_KEY;
export function paystackProviderStatus() { return { provider: secret ? "paystack" : "unconfigured" }; }

export async function initializePaystack(input: { email: string; amountCents: number; currency: string; callbackUrl: string; orderId: string }) {
  if (!secret) throw new Error("Paystack is not configured");
  const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: input.email, amount: String(input.amountCents), currency: input.currency, callback_url: input.callbackUrl, metadata: { order_id: input.orderId } }) });
  const data = await response.json() as { status?: boolean; message?: string; data?: { authorization_url?: string; access_code?: string; reference?: string } };
  if (!response.ok || !data.status || !data.data?.authorization_url || !data.data.reference) throw new Error(data.message ?? "Paystack checkout initialization failed");
  return { url: data.data.authorization_url, reference: data.data.reference, accessCode: data.data.access_code };
}

export function verifyPaystackSignature(payload: Buffer, signature: string) { return Boolean(secret) && crypto.createHmac("sha512", secret!).update(payload).digest("hex") === signature; }
